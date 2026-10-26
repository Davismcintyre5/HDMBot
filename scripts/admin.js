require('../scripts/dnsSet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const env = require('../config/env');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

function log(msg, color = 'white') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function divider() {
  console.log(`${colors.gray}${'─'.repeat(50)}${colors.reset}`);
}

function ask(question) {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${question}${colors.reset}`, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function connect() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    const { connection } = mongoose;
    log(`Connected to MongoDB: ${connection.name}`, 'green');
    return true;
  } catch (err) {
    log(`Connection failed: ${err.message}`, 'red');
    return false;
  }
}

function loadModels() {
  return {
    AdminUser: require('../models/AdminUser'),
    Session: require('../models/Session'),
    Message: require('../models/Message'),
    Setting: require('../models/Setting'),
    EventLog: require('../models/EventLog'),
    Rule: require('../models/Rule'),
    Contact: require('../models/Contact'),
    Command: require('../models/Command')
  };
}

// ==================== ADMIN USERS ====================

async function createAdmin(models) {
  log('\n➕ Create Admin User', 'cyan');
  divider();

  const email = await ask('Email: ');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return log('Valid email required. Cancelled.', 'red');
  }

  const existing = await models.AdminUser.findOne({ email: email.toLowerCase() });
  if (existing) return log('Email already exists. Cancelled.', 'red');

  const username = await ask('Username: ');
  if (!username || username.length < 3) {
    return log('Username must be at least 3 chars. Cancelled.', 'red');
  }

  const usernameTaken = await models.AdminUser.findOne({ username: username.toLowerCase() });
  if (usernameTaken) return log('Username already exists. Cancelled.', 'red');

  const password = await ask('Password (min 8 chars): ');
  if (!password || password.length < 8) {
    return log('Password must be at least 8 characters. Cancelled.', 'red');
  }

  const role = (await ask('Role (owner/admin/moderator/viewer) [owner]: ')) || 'owner';
  if (!['owner', 'admin', 'moderator', 'viewer'].includes(role)) {
    return log('Invalid role. Cancelled.', 'red');
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await models.AdminUser.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
      role,
      active: true,
      createdBy: 'admin-cli'
    });
    log(`\n✅ Admin created`, 'green');
    log(`   Username: ${user.username}`, 'white');
    log(`   Email:    ${user.email}`, 'white');
    log(`   Role:     ${user.role}`, 'white');
    log(`\n   Login at: /login`, 'cyan');
  } catch (err) {
    if (err.code === 11000) return log('Duplicate email or username.', 'red');
    log(`Error: ${err.message}`, 'red');
  }
}

async function listAdmins(models) {
  log('\n👥 Admin Users', 'cyan');
  divider();

  const users = await models.AdminUser.find({}).sort({ createdAt: -1 });
  if (users.length === 0) return log('No admin users. Create one!', 'yellow');

  users.forEach((u, i) => {
    const status = u.active ? '🟢' : '🔴';
    const last = u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never';
    log(
      `  ${i + 1}. ${status} ${u.email} | ${u.username} | ${u.role} | Last: ${last}`,
      'white'
    );
  });

  log(`\nTotal: ${users.length}`, 'green');
}

async function toggleAdmin(models) {
  log('\n🔒 Toggle Admin Status', 'cyan');
  divider();

  const users = await models.AdminUser.find({}).sort({ createdAt: -1 });
  if (users.length === 0) return log('No users', 'yellow');

  users.forEach((u, i) => {
    log(`  ${i + 1}. ${u.email} — ${u.active ? 'Active' : 'Disabled'}`, 'white');
  });

  const n = parseInt(await ask('\nNumber (0 to cancel): '), 10);
  if (n === 0) return log('Cancelled', 'yellow');
  const user = users[n - 1];
  if (!user) return log('Invalid selection', 'red');

  user.active = !user.active;
  await user.save();
  log(`✅ ${user.email} is now ${user.active ? 'active' : 'disabled'}`, 'green');
}

async function resetAdminPassword(models) {
  log('\n🔑 Reset Admin Password', 'cyan');
  divider();

  const users = await models.AdminUser.find({}).sort({ createdAt: -1 });
  if (users.length === 0) return log('No users', 'yellow');

  users.forEach((u, i) => log(`  ${i + 1}. ${u.email}`, 'white'));

  const n = parseInt(await ask('\nNumber (0 to cancel): '), 10);
  if (n === 0) return log('Cancelled', 'yellow');
  const user = users[n - 1];
  if (!user) return log('Invalid selection', 'red');

  const newPassword = await ask('New password (min 8 chars): ');
  if (!newPassword || newPassword.length < 8) {
    return log('Password too short. Cancelled.', 'red');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  log(`✅ Password reset for ${user.email}`, 'green');
}

async function deleteAdmin(models) {
  log('\n🗑️  Delete Admin', 'cyan');
  divider();

  const users = await models.AdminUser.find({}).sort({ createdAt: -1 });
  if (users.length === 0) return log('No users', 'yellow');

  users.forEach((u, i) => log(`  ${i + 1}. ${u.email} (${u.role})`, 'white'));

  const n = parseInt(await ask('\nNumber (0 to cancel): '), 10);
  if (n === 0) return log('Cancelled', 'yellow');
  const user = users[n - 1];
  if (!user) return log('Invalid selection', 'red');

  const confirm = await ask(`Type "${user.email}" to confirm: `);
  if (confirm !== user.email) return log('Cancelled', 'yellow');

  await models.AdminUser.findByIdAndDelete(user._id);
  log(`✅ ${user.email} deleted`, 'green');
}

// ==================== SESSIONS ====================

async function listSessions(models) {
  log('\n📱 WhatsApp Sessions', 'cyan');
  divider();

  const sessions = await models.Session.find({}).sort({ updatedAt: -1 });
  if (sessions.length === 0) return log('No sessions', 'yellow');

  sessions.forEach((s, i) => {
    const status = s.status === 'active' ? '🟢' : '🔴';
    const phone = (s.meta && s.meta.phoneNumber) || 'N/A';
    log(`  ${i + 1}. ${status} ${s.sessionId} | ${phone} | v${s.version || 0}`, 'white');
  });
  log(`\nTotal: ${sessions.length}`, 'green');
}

async function deleteSession(models) {
  log('\n🗑️  Delete Session', 'cyan');
  divider();

  const sessions = await models.Session.find({}).sort({ updatedAt: -1 });
  if (sessions.length === 0) return log('No sessions', 'yellow');

  sessions.forEach((s, i) => log(`  ${i + 1}. ${s.sessionId}`, 'white'));

  const n = parseInt(await ask('\nNumber (0 to cancel): '), 10);
  if (n === 0) return log('Cancelled', 'yellow');
  const s = sessions[n - 1];
  if (!s) return log('Invalid selection', 'red');

  const confirm = await ask(`Type "${s.sessionId}" to confirm: `);
  if (confirm !== s.sessionId) return log('Cancelled', 'yellow');

  const fs = require('fs');
  const path = require('path');
  const dir = path.join(env.AUTH_TMP_DIR, s.sessionId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });

  await models.Session.deleteOne({ _id: s._id });
  log(`✅ ${s.sessionId} deleted`, 'green');
}

async function dropAllSessions(models) {
  log('\n💣 Drop ALL Sessions', 'red');
  divider();
  log('This deletes every WhatsApp session from the DB.', 'yellow');
  log('(tmpdir files are NOT removed — they expire on reboot / next deploy)', 'gray');

  const confirm = await ask('Type "DELETE SESSIONS" to confirm: ');
  if (confirm !== 'DELETE SESSIONS') return log('Cancelled', 'yellow');

  const result = await models.Session.deleteMany({});
  log(`✅ Deleted ${result.deletedCount} sessions`, 'green');
}

// ==================== DATABASE ====================

async function listCollections() {
  log('\n📚 Collections', 'cyan');
  divider();

  const cols = await mongoose.connection.db.listCollections().toArray();
  let total = 0;
  for (const c of cols) {
    const count = await mongoose.connection.db.collection(c.name).countDocuments();
    log(`  ${c.name.padEnd(20)} ${String(count).padStart(8)} docs`, 'white');
    total += count;
  }
  divider();
  log(`  Collections: ${cols.length} | Total docs: ${total}`, 'green');
}

async function dropCollection() {
  log('\n🗑️  Drop Collection', 'red');
  divider();

  const cols = await mongoose.connection.db.listCollections().toArray();
  if (cols.length === 0) return log('No collections', 'yellow');

  cols.forEach((c, i) => log(`  ${i + 1}. ${c.name}`, 'white'));

  const n = parseInt(await ask('\nNumber (0 to cancel): '), 10);
  if (n === 0) return log('Cancelled', 'yellow');
  const col = cols[n - 1];
  if (!col) return log('Invalid selection', 'red');

  const confirm = await ask(`Type "DROP ${col.name}" to confirm: `);
  if (confirm !== `DROP ${col.name}`) return log('Cancelled', 'yellow');

  await mongoose.connection.db.collection(col.name).drop();
  log(`✅ ${col.name} dropped`, 'green');
}

async function dropDatabase() {
  log('\n💀 Drop Entire Database', 'red');
  divider();
  log(`Database: ${mongoose.connection.name}`, 'yellow');
  log('ALL data will be lost.', 'red');

  const s1 = await ask('Type "I UNDERSTAND": ');
  if (s1 !== 'I UNDERSTAND') return log('Cancelled', 'yellow');

  const s2 = await ask(`Type "${mongoose.connection.name}": `);
  if (s2 !== mongoose.connection.name) return log('Mismatch. Cancelled', 'red');

  const s3 = await ask('Type "DROP DATABASE NOW": ');
  if (s3 !== 'DROP DATABASE NOW') return log('Cancelled', 'yellow');

  await mongoose.connection.db.dropDatabase();
  log('✅ Database dropped', 'green');
  log('Restart the server to reconnect.', 'yellow');
}

// ==================== MENU ====================

function showMenu() {
  console.log('');
  log('╔══════════════════════════════════════╗', 'magenta');
  log('║     HDM BOT v3 — Admin CLI           ║', 'magenta');
  log('╠══════════════════════════════════════╣', 'magenta');
  log('║  👤 ADMIN USERS                      ║', 'magenta');
  log('║  1. ➕ Create Admin                  ║', 'green');
  log('║  2. 👥 List Admins                   ║', 'white');
  log('║  3. 🔒 Toggle Active                 ║', 'white');
  log('║  4. 🔑 Reset Password                ║', 'white');
  log('║  5. 🗑️  Delete Admin                  ║', 'red');
  log('╠══════════════════════════════════════╣', 'magenta');
  log('║  📱 WHATSAPP SESSIONS                ║', 'magenta');
  log('║  6. 📱 List Sessions                 ║', 'white');
  log('║  7. 🗑️  Delete Session                ║', 'red');
  log('║  8. 💣 Drop All Sessions             ║', 'red');
  log('╠══════════════════════════════════════╣', 'magenta');
  log('║  🗄️  DATABASE                         ║', 'magenta');
  log('║  9. 📚 List Collections              ║', 'white');
  log('║ 10. 🗑️  Drop Collection               ║', 'red');
  log('║ 11. 💀 Drop Database                 ║', 'red');
  log('╠══════════════════════════════════════╣', 'magenta');
  log('║  0. 🚪 Exit                          ║', 'white');
  log('╚══════════════════════════════════════╝', 'magenta');
}

async function main() {
  log('\n🔌 Connecting to MongoDB...', 'yellow');
  const ok = await connect();
  if (!ok) {
    log('Failed. Check MONGODB_URI in .env', 'red');
    process.exit(1);
  }

  const models = loadModels();
  let running = true;

  while (running) {
    showMenu();
    const choice = await ask('\nSelect: ');

    switch (choice) {
      case '1': await createAdmin(models); break;
      case '2': await listAdmins(models); break;
      case '3': await toggleAdmin(models); break;
      case '4': await resetAdminPassword(models); break;
      case '5': await deleteAdmin(models); break;
      case '6': await listSessions(models); break;
      case '7': await deleteSession(models); break;
      case '8': await dropAllSessions(models); break;
      case '9': await listCollections(); break;
      case '10': await dropCollection(); break;
      case '11': await dropDatabase(); break;
      case '0':
        running = false;
        log('\n👋 Goodbye', 'green');
        break;
      default:
        log('Invalid option', 'red');
    }

    if (running) await ask('\nPress Enter to continue...');
  }

  await mongoose.disconnect();
  rl.close();
  process.exit(0);
}

main().catch((err) => {
  log(`Fatal: ${err.message}`, 'red');
  process.exit(1);
});