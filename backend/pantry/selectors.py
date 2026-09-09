from pantry.models import PantryItem


def owned_stock(owner):
    return [
        {
            "id": item.pk,
            "foodId": item.food_id or f"custom:{item.custom_food_id}",
            "quantity": item.quantity,
            "unit": item.unit,
            "date": item.date,
            "dateKind": item.date_kind,
            "storageLocation": item.storage_location,
            "addedDate": item.created_at.date(),
        }
        for item in PantryItem.objects.filter(owner=owner, quantity__gt=0)
    ]
