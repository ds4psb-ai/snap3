/**
 * ESLint rule to prevent using NextResponse.json() with headers option
 * Enforces the pattern of setting headers separately using res.headers.set()
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow NextResponse.json() with headers option, use res.headers.set() instead',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      noHeadersOption: 'Do not use headers option in NextResponse.json(). Use const res = NextResponse.json(...); res.headers.set(...) pattern instead.',
      noHeadersInNew: 'Do not use headers option in new NextResponse(). Set headers using res.headers.set() after creation.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        // Check for NextResponse.json(..., { headers })
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.name === 'NextResponse' &&
          node.callee.property.name === 'json' &&
          node.arguments.length >= 2
        ) {
          const secondArg = node.arguments[1];
          if (
            secondArg.type === 'ObjectExpression' &&
            secondArg.properties.some(
              prop =>
                prop.type === 'Property' &&
                prop.key.type === 'Identifier' &&
                prop.key.name === 'headers'
            )
          ) {
            context.report({
              node: secondArg,
              messageId: 'noHeadersOption',
              fix(fixer) {
                // This is a simplified fix - in practice, you'd want more sophisticated transformation
                const sourceCode = context.getSourceCode();
                const fixes = [];
                
                // Find the headers property
                const headersProperty = secondArg.properties.find(
                  prop => prop.key?.name === 'headers'
                );
                
                if (!headersProperty) return null;
                
                // Remove headers from the options object
                const otherProps = secondArg.properties.filter(
                  prop => prop.key?.name !== 'headers'
                );
                
                if (otherProps.length === 0) {
                  // If headers was the only property, remove the entire second argument
                  fixes.push(
                    fixer.replaceText(
                      node,
                      `NextResponse.json(${sourceCode.getText(node.arguments[0])})`
                    )
                  );
                } else {
                  // Otherwise, just remove the headers property
                  const text = `{ ${otherProps
                    .map(prop => sourceCode.getText(prop))
                    .join(', ')} }`;
                  fixes.push(fixer.replaceText(secondArg, text));
                }
                
                // Add a comment suggesting the correct pattern
                fixes.push(
                  fixer.insertTextAfter(
                    node,
                    '\n// TODO: Set headers using res.headers.set() pattern'
                  )
                );
                
                return fixes;
              },
            });
          }
        }

        // Check for new NextResponse(..., { headers })
        if (
          node.callee.type === 'NewExpression' &&
          node.callee.callee.name === 'NextResponse' &&
          node.arguments.length >= 2
        ) {
          const secondArg = node.arguments[1];
          if (
            secondArg.type === 'ObjectExpression' &&
            secondArg.properties.some(
              prop =>
                prop.type === 'Property' &&
                prop.key.type === 'Identifier' &&
                prop.key.name === 'headers'
            )
          ) {
            context.report({
              node: secondArg,
              messageId: 'noHeadersInNew',
            });
          }
        }
      },
    };
  },
};