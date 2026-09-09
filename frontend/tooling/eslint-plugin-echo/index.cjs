const tokenProperty = /^(fontSize|margin\w*|padding\w*|border\w*Radius|duration|delay|animationDuration|animationDelay|transitionDuration|transitionDelay)$/;
const rawColor = /#[\da-f]{3,8}\b/i;
const pixels = /(?:\d|\.)\s*px\b|^px\b/i;
const styleProps = new Set(['style', 'className']);

function propertyName(node) {
  return node.type === 'Identifier' || node.type === 'JSXIdentifier' ? node.name : node.value;
}

function hasNumber(node) {
  if (!node) return false;
  if (node.type === 'Literal') return typeof node.value === 'number';
  if (['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'UnaryExpression'].includes(node.type)) {
    return hasNumber(node.expression || node.argument);
  }
  if (node.type === 'ConditionalExpression') return hasNumber(node.consequent) || hasNumber(node.alternate);
  if (['BinaryExpression', 'LogicalExpression'].includes(node.type)) return hasNumber(node.left) || hasNumber(node.right);
  if (node.type === 'ArrayExpression') return node.elements.some(hasNumber);
  return false;
}

function importedPrimitive(source) {
  return /^(react-native|react-native-web|@gluestack-ui\/[^/]+)$/.test(source);
}

module.exports = {
  rules: {
    'token-values': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          rawColor: 'Use a semantic theme token instead of a raw hex color.',
          pixels: 'Use rem/pt tokens instead of pixel values.',
          number: 'Use a named token for {{property}} instead of a literal number.',
        },
      },
      create(context) {
        function checkText(node, value) {
          if (typeof value !== 'string') return;
          if (rawColor.test(value)) context.report({ node, messageId: 'rawColor' });
          if (pixels.test(value)) context.report({ node, messageId: 'pixels' });
        }
        function checkNumber(node, name, value) {
          if (tokenProperty.test(name) && hasNumber(value)) {
            context.report({ node, messageId: 'number', data: { property: name } });
          }
        }
        return {
          Literal(node) { checkText(node, node.value); },
          TemplateElement(node) { checkText(node, node.value.cooked || node.value.raw); },
          Property(node) { checkNumber(node, propertyName(node.key), node.value); },
          JSXAttribute(node) {
            const value = node.value?.type === 'JSXExpressionContainer' ? node.value.expression : node.value;
            checkNumber(node, propertyName(node.name), value);
          },
        };
      },
    },
    'no-style-props': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          variant: 'Compose Echo components through variant, size, and tone; do not pass {{property}}.',
        },
      },
      create(context) {
        const primitives = new Set();
        const namespaces = new Set();
        function isPrimitive(name) {
          if (name.type === 'JSXIdentifier') return /^[a-z]/.test(name.name) || primitives.has(name.name);
          return name.type === 'JSXMemberExpression' && namespaces.has(name.object.name);
        }
        function report(node, property) {
          context.report({ node, messageId: 'variant', data: { property } });
        }
        function inspectSpread(node, expression, seen = new Set()) {
          if (!expression || seen.has(expression)) return;
          seen.add(expression);
          if (expression.type === 'ObjectExpression') {
            for (const prop of expression.properties) {
              if (prop.type === 'SpreadElement') inspectSpread(node, prop.argument, seen);
              else if (styleProps.has(propertyName(prop.key))) report(node, propertyName(prop.key));
            }
          } else if (expression.type === 'Identifier') {
            for (let scope = context.getScope(); scope; scope = scope.upper) {
              const variable = scope.set.get(expression.name);
              if (variable) {
                for (const def of variable.defs) inspectSpread(node, def.node.init, seen);
                break;
              }
            }
          } else if (['TSAsExpression', 'TSSatisfiesExpression'].includes(expression.type)) {
            inspectSpread(node, expression.expression, seen);
          }
        }
        return {
          ImportDeclaration(node) {
            const source = node.source.value;
            for (const specifier of node.specifiers) {
              if (importedPrimitive(source)) {
                if (specifier.type === 'ImportNamespaceSpecifier') namespaces.add(specifier.local.name);
                else primitives.add(specifier.local.name);
              }
              if (source === '@/design/theme' && ['MotionView', 'MotionPressable'].includes(specifier.imported?.name)) {
                primitives.add(specifier.local.name);
              }
              if (source === '@/design/modal' && ['Modal', 'ModalContent', 'ModalBackdrop'].includes(specifier.imported?.name)) {
                primitives.add(specifier.local.name);
              }
              if (['motion/react', 'motion/react-m'].includes(source) && ['motion', 'm'].includes(specifier.imported?.name)) {
                namespaces.add(specifier.local.name);
              }
            }
          },
          JSXOpeningElement(node) {
            if (isPrimitive(node.name)) return;
            for (const prop of node.attributes) {
              if (prop.type === 'JSXAttribute' && styleProps.has(prop.name.name)) report(prop, prop.name.name);
              if (prop.type === 'JSXSpreadAttribute') inspectSpread(prop, prop.argument);
            }
          },
        };
      },
    },
  },
};
