const fs = require('fs');

console.log("🚀 Testing Secrets Management...\n");

const checks = {
  "scripts/rotate-keys.sh": fs.existsSync('scripts/rotate-keys.sh'),
  "docs/SECRETS_MANAGEMENT.md": fs.existsSync('docs/SECRETS_MANAGEMENT.md'),
  "web/.env.local": fs.existsSync('web/.env.local'),
};

let allPass = true;
Object.entries(checks).forEach(([file, exists]) => {
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allPass = false;
});

if (allPass) {
  console.log("\n🎉 SECRETS MANAGEMENT SETUP IS COMPLETE!");
}
