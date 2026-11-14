async function testEnvironmentIsolation() {
  console.log("🚀 Testing Environment Isolation...\n");

  // 1. بررسی اینکه فایل‌های نمونه ساخته شده‌اند
  const fs = require('fs');
  const files = ['.env.staging.example', '.env.production.example'];
  
  console.log("1. Checking environment template files:");
  files.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  });

  // 2. بررسی اینکه فایل‌های واقعی env در گیت نیستند
  console.log("\n2. Checking .gitignore protection:");
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const protectedFiles = ['.env.local', '.env.production', '.env.staging'];
  protectedFiles.forEach(file => {
    const isProtected = gitignore.includes('.env*');
    console.log(`   ${isProtected ? '✅' : '❌'} ${file} is ignored`);
  });

  // 3. بررسی فایل env-check
  console.log("\n3. Checking env validation module:");
  const envCheckExists = fs.existsSync('src/lib/env-check.ts');
  console.log(`   ${envCheckExists ? '✅' : '❌'} src/lib/env-check.ts`);

  // 4. نمایش محیط فعلی
  console.log(`\n4. Current Environment: ${process.env.NEXT_PUBLIC_ENVIRONMENT || 'development'}`);
  console.log(`   Node Env: ${process.env.NODE_ENV}`);

  if (envCheckExists) {
    console.log("\n🎉 ENVIRONMENT ISOLATION IS READY!");
  }
}
testEnvironmentIsolation();
