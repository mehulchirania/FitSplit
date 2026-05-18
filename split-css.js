const fs = require('fs');
const postcss = require('postcss');

const inputFile = 'app/globals.css';
const appFile = 'app/globals.css';
const landingFile = 'app/landing.css';

const css = fs.readFileSync(inputFile, 'utf8');

const root = postcss.parse(css);
const landingRoot = postcss.root();

let landingNodes = [];

root.walkRules((rule) => {
  if (rule.selector && (rule.selector.includes('.lp-') || rule.selector.includes('.landing-'))) {
    landingNodes.push(rule);
  }
});

// Also grab at-rules that contain only landing stuff, or just move the rules.
// Actually, some rules might be inside @media queries.
// A better way: walk all rules. If it matches, clone it into landingRoot, and remove from original root.

const root2 = postcss.parse(css);
const landingRoot2 = postcss.root();

root2.walk((node) => {
  if (node.type === 'rule') {
    if (node.selector && (node.selector.includes('.lp-') || node.selector.includes('.landing-'))) {
      // Check if it's inside an at-rule
      if (node.parent.type === 'atrule') {
        // We need to clone the at-rule if it doesn't exist in landingRoot, but for simplicity, just copy the whole at-rule if all its rules match?
        // Let's just clone the rule and append it. We might lose media query wrapper.
        // Let's do it safely:
      } else {
        landingRoot2.append(node.clone());
        node.remove();
      }
    }
  }
});

// Let's refine:
const finalRoot = postcss.parse(css);
const finalLandingRoot = postcss.root();

finalRoot.walkRules((rule) => {
  if (rule.selector && (rule.selector.includes('.lp-') || rule.selector.includes('.landing-'))) {
    if (rule.parent.type === 'root') {
      finalLandingRoot.append(rule.clone());
      rule.remove();
    } else if (rule.parent.type === 'atrule') {
      // Find or create the atrule in finalLandingRoot
      let existingAtRule = null;
      finalLandingRoot.walkAtRules(rule.parent.name, (atRule) => {
        if (atRule.params === rule.parent.params) {
          existingAtRule = atRule;
        }
      });
      if (!existingAtRule) {
        existingAtRule = postcss.atRule({ name: rule.parent.name, params: rule.parent.params });
        finalLandingRoot.append(existingAtRule);
      }
      existingAtRule.append(rule.clone());
      rule.remove();
    }
  }
});

// Clean up empty at-rules in finalRoot
finalRoot.walkAtRules((atRule) => {
  if (atRule.nodes && atRule.nodes.length === 0) {
    atRule.remove();
  }
});

fs.writeFileSync(appFile, finalRoot.toString());
fs.writeFileSync(landingFile, finalLandingRoot.toString());

console.log('Successfully split CSS!');
