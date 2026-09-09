from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from common.throttles import AuthThrottle


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        attrs["email"] = attrs["email"].strip().lower()
        return super().validate(attrs)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    throttle_classes = [AuthThrottle]


class RefreshView(TokenRefreshView):
    throttle_classes = [AuthThrottle]


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "id": request.user.pk,
                "email": request.user.email,
                "name": request.user.first_name,
            }
        )


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [AuthThrottle]

    def post(self, request):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        from django.db import IntegrityError, transaction
        from rest_framework import serializers
        from rest_framework.exceptions import ValidationError
        from rest_framework_simplejwt.tokens import RefreshToken

        from accounts.models import User
        from pantry.services import initialize_pantry

        class Registration(serializers.Serializer):
            email = serializers.EmailField()
            password = serializers.CharField(write_only=True, trim_whitespace=False, min_length=8)
            name = serializers.CharField(required=False, max_length=150, default="")

        form = Registration(data=request.data)
        form.is_valid(raise_exception=True)
        values = form.validated_data
        email = values["email"].strip().lower()
        user = User(email=email, first_name=values["name"])
        try:
            validate_password(values["password"], user)
        except DjangoValidationError as error:
            raise ValidationError({"password": error.messages}) from error
        try:
            with transaction.atomic():
                if User.objects.filter(email__iexact=email).exists():
                    raise ValidationError({"email": ["An account with this email already exists."]})
                user.set_password(values["password"])
                user.save()
                seeded = initialize_pantry(user)
                refresh = RefreshToken.for_user(user)
        except IntegrityError as error:
            if not User.objects.filter(email=email).exists():
                raise
            raise ValidationError(
                {"email": ["An account with this email already exists."]}
            ) from error
        return Response(
            {
                "user": {"id": user.pk, "email": user.email, "name": user.first_name},
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "pantrySeeded": seeded,
            },
            status=201,
        )
