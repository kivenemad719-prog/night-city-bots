const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  AttachmentBuilder
} = require('discord.js');

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

/* =========================
   IDs
========================= */

const GUILD_ID = '1482955089391124583';

const ADMIN_ROLE_ID = '1484040156318138390';
const SUPPORT_ROLE_ID = '1484040249788207175';
const PLAYER_ROLE_ID = '1484231061524189225';

const WELCOME_CHANNEL_ID = '1484024608486326312';
const RULES_CHANNEL_ID = '1484026706053431316';
const TICKETS_PANEL_CHANNEL_ID = '1484075251389435934';
const DECISION_CHANNEL_ID = '1484041156428955738';
const LOG_CHANNEL_ID = '1484041450478895184';
const REVIEW_CHANNEL_ID = '1484303917998276648';
const APPLICATION_REVIEW_CHANNEL_ID = '1484304595730829352';

const CATEGORY_SUPPORT_ID = '1484041614320996413';
const CATEGORY_REPORTS_ID = '1484041819330183279';
const CATEGORY_QUESTIONS_ID = '1484042095306997830';
const CATEGORY_SUGGESTIONS_ID = '1484042283673190491';
const CATEGORY_PARTNERSHIP_ID = '1484042422626422845';

/* =========================
   Roles on accept
========================= */

const APPROVED_ADMIN_ROLE_IDS = [
  '1484244769566752819',
  '1484244554176663572',
  '1484040156318138390',
  '1484040249788207175'
];

/* =========================
   Settings
========================= */

const CLIENT_ID = '1484035052198428843';
const BOT_NAME = 'Night City Community';
const BOT_FOOTER = 'Night City Community System';

const EMAIL_USER = process.env.EMAIL_USER || 'nightcity12600@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'bpghzntsoujdptwo';
const SERVER_LOGO =
  process.env.SERVER_LOGO ||
  'https://cdn.discordapp.com/attachments/1484055738753093724/1484655006836719799/53114046-5DF9-4345-94CB-EBF5A32F93C5.png?ex=69bf0439&is=69bdb2b9&hm=c931877619e683c5425ea91ec35ece369cfd7c0426844c75d992ee4ad78db69d&';

/* =========================
   Email
========================= */

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000
});

transporter.verify((err) => {
  if (err) {
    console.log('❌ Email Error:', err.message);
  } else {
    console.log('✅ Email Ready');
  }
});

async function sendEmail(to, subject, html) {
  try {
    if (!to || !EMAIL_USER || !EMAIL_PASS) {
      console.log('❌ Email skipped: missing email config or recipient');
      return false;
    }

    await transporter.sendMail({
      from: `"${BOT_NAME}" <${EMAIL_USER}>`,
      to,
      subject,
      html
    });

    console.log(`✅ Email sent to ${to}`);
    return true;
  } catch (err) {
    console.log('❌ Email Error:', err.message);
    return false;
  }
}

/* =========================
   Data file
========================= */

const DATA_FILE = path.join(__dirname, 'bot-data.json');

function defaultData() {
  return {
    ticketCounter: 1,
    applications: {},
    system: {
      tickets: true,
      applications: true,
      buttons: {
        ticket_support: true,
        ticket_report: true,
        ticket_question: true,
        ticket_suggestion: true,
        ticket_partnership: true,
        apply_admin: true,
        accept_application: true,
        reject_application: true,
        set_appointment: true,
        renew_appointment: true
      }
    }
  };
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return defaultData();
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const base = defaultData();

    return {
      ...base,
      ...parsed,
      applications: parsed.applications || {},
      ticketCounter: parsed.ticketCounter || 1,
      system: {
        ...base.system,
        ...(parsed.system || {}),
        buttons: {
          ...base.system.buttons,
          ...((parsed.system && parsed.system.buttons) || {})
        }
      }
    };
  } catch {
    return defaultData();
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch {
    console.log('❌ Failed to save data file');
  }
}

const dataStore = loadData();

/* =========================
   Client
========================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

/* =========================
   Ticket types
========================= */

const TICKET_TYPES = {
  ticket_support: {
    label: 'دعم فني',
    emoji: '🎫',
    categoryId: CATEGORY_SUPPORT_ID,
    prefix: 'support',
    color: 0x5865F2
  },
  ticket_report: {
    label: 'إبلاغ',
    emoji: '🚨',
    categoryId: CATEGORY_REPORTS_ID,
    prefix: 'report',
    color: 0xED4245
  },
  ticket_question: {
    label: 'استفسار',
    emoji: '❓',
    categoryId: CATEGORY_QUESTIONS_ID,
    prefix: 'question',
    color: 0xFEE75C
  },
  ticket_suggestion: {
    label: 'اقتراح',
    emoji: '💡',
    categoryId: CATEGORY_SUGGESTIONS_ID,
    prefix: 'suggestion',
    color: 0x57F287
  },
  ticket_partnership: {
    label: 'شراكة',
    emoji: '🤝',
    categoryId: CATEGORY_PARTNERSHIP_ID,
    prefix: 'partner',
    color: 0xEB459E
  }
};

const claimedTickets = new Map();

/* =========================
   Helpers
========================= */

function getNextTicketId() {
  const id = dataStore.ticketCounter || 1;
  dataStore.ticketCounter = id + 1;
  saveData(dataStore);
  return id;
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAdmin(member) {
  return member?.roles?.cache?.has(ADMIN_ROLE_ID);
}

function isSupport(member) {
  return member?.roles?.cache?.has(SUPPORT_ROLE_ID);
}

function isStaff(member) {
  return isAdmin(member) || isSupport(member);
}

function isButtonEnabled(key) {
  return Boolean(dataStore.system?.buttons?.[key]);
}

function toggleButtonSetting(key) {
  dataStore.system.buttons[key] = !dataStore.system.buttons[key];
  saveData(dataStore);
}

function setApplicationData(userId, payload) {
  dataStore.applications[userId] = {
    ...(dataStore.applications[userId] || {}),
    ...payload
  };
  saveData(dataStore);
}

function getApplicationData(userId) {
  return dataStore.applications?.[userId] || null;
}

async function fetchChannel(channelId) {
  try {
    return await client.channels.fetch(channelId);
  } catch {
    return null;
  }
}

async function sendLog(content) {
  const logChannel = await fetchChannel(LOG_CHANNEL_ID);
  if (!logChannel) return;
  await logChannel.send({ content }).catch(() => {});
}

function parseTicketTopic(topic) {
  if (!topic) return {};
  const ownerMatch = topic.match(/OWNER:(\d+)/);
  const typeMatch = topic.match(/TYPE:([a-z_]+)/);
  const idMatch = topic.match(/ID:(\d+)/);

  return {
    ownerId: ownerMatch ? ownerMatch[1] : null,
    ticketType: typeMatch ? typeMatch[1] : null,
    ticketId: idMatch ? idMatch[1] : null
  };
}

async function createTranscript(channel) {
  const fetched = await channel.messages.fetch({ limit: 100 });
  const messages = [...fetched.values()].reverse();

  let content = `Transcript for #${channel.name}\nGenerated at: ${new Date().toISOString()}\n`;
  content += '============================================================\n\n';

  for (const msg of messages) {
    const date = new Date(msg.createdTimestamp).toLocaleString('en-US');
    content += `[${date}] ${msg.author.tag}: ${msg.content || '[embed/attachment]'}\n`;
  }

  return Buffer.from(content, 'utf-8');
}

/* =========================
   Email templates
========================= */

function buildAcceptEmailHtml(username, appointmentText) {
  return `
  <div style="font-family:Arial,sans-serif;background:#edf0f5;padding:20px;direction:rtl;text-align:right;">
    <div style="max-width:700px;margin:auto;background:#f5f7fb;border-radius:18px;overflow:hidden;border:1px solid #cfd8e3;">
      <div style="background:#cfeaf5;padding:30px;text-align:center;border-bottom:4px solid #4f91ad;">
        <img src="${SERVER_LOGO}" alt="logo" width="180" style="border-radius:50%;display:block;margin:auto;">
        <h1 style="margin:20px 0 0;color:#0d617f;font-size:48px;">🎉 تم قبول طلبك</h1>
        <div style="margin-top:18px;font-size:28px;font-weight:bold;color:#163a52;">${BOT_NAME}</div>
      </div>

      <div style="padding:35px 40px;color:#33566a;font-size:22px;line-height:2;">
        <p>مرحبًا <strong style="color:#0d617f;">${username}</strong>،</p>
        <p>تم قبول طلبك بنجاح داخل <strong>${BOT_NAME}</strong>.</p>

        <div style="background:#d9eef7;border-radius:18px;padding:25px;margin:25px 0;border-right:8px solid #0d617f;">
          <h2 style="margin-top:0;color:#0d617f;">📅 موعد المقابلة الصوتية</h2>
          <div style="font-size:21px;color:#355667;">${appointmentText || 'سيتم تحديده قريبًا.'}</div>
        </div>

        <div style="background:#eef4fb;border:1px solid #c9d6e4;border-radius:18px;padding:25px;">
          <h2 style="margin-top:0;color:#0d617f;">📋 الخطوات التالية</h2>
          <ul style="padding-right:20px;line-height:2;">
            <li>🎙️ حضور المقابلة الصوتية</li>
            <li>📌 الالتزام بالموعد</li>
            <li>🎤 التأكد من عمل الميكروفون</li>
            <li>📜 الالتزام بقوانين السيرفر</li>
          </ul>
        </div>
      </div>

      <div style="border-top:1px solid #cfd8e3;padding:20px;text-align:center;color:#5b7890;font-size:18px;">
        © 2026 ${BOT_NAME}
      </div>
    </div>
  </div>`;
}

function buildRejectEmailHtml(username, reason) {
  return `
  <div style="font-family:Arial,sans-serif;background:#edf0f5;padding:20px;direction:rtl;text-align:right;">
    <div style="max-width:700px;margin:auto;background:#f5f7fb;border-radius:18px;overflow:hidden;border:1px solid #cfd8e3;">
      <div style="background:#f4d7d7;padding:30px;text-align:center;border-bottom:4px solid #c04848;">
        <img src="${SERVER_LOGO}" alt="logo" width="180" style="border-radius:50%;display:block;margin:auto;">
        <h1 style="margin:20px 0 0;color:#8a1f1f;font-size:48px;">❌ تم رفض الطلب</h1>
        <div style="margin-top:18px;font-size:28px;font-weight:bold;color:#163a52;">${BOT_NAME}</div>
      </div>

      <div style="padding:35px 40px;color:#33566a;font-size:22px;line-height:2;">
        <p>مرحبًا <strong style="color:#8a1f1f;">${username}</strong>،</p>
        <p>لم يتم قبول طلبك هذه المرة داخل <strong>${BOT_NAME}</strong>.</p>

        <div style="background:#fdeaea;border-radius:18px;padding:25px;margin:25px 0;border-right:8px solid #c04848;">
          <h2 style="margin-top:0;color:#8a1f1f;">📄 سبب الرفض</h2>
          <div style="font-size:21px;color:#5c3636;">${reason}</div>
        </div>
      </div>

      <div style="border-top:1px solid #cfd8e3;padding:20px;text-align:center;color:#5b7890;font-size:18px;">
        © 2026 ${BOT_NAME}
      </div>
    </div>
  </div>`;
}

/* =========================
   Panel builders
========================= */

function buildWelcomeEmbed() {
  return new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle(`👋 مرحبًا بك في ${BOT_NAME}`)
    .setDescription(
      `مرحبًا بك في سيرفر **${BOT_NAME}** 🌆\n\n` +
      `يرجى قراءة القوانين أولًا قبل التفاعل داخل السيرفر.`
    )
    .setFooter({ text: BOT_FOOTER });
}

function buildRulesButtonRow(guildId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('📜 الدخول إلى القوانين')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/channels/${guildId}/${RULES_CHANNEL_ID}`)
  );
}

function buildTicketsPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎫 نظام التذاكر')
    .setDescription(
      `اختر نوع التذكرة المناسب من الأزرار بالأسفل.\n\n` +
      `كل نوع يفتح في كاتيجوري مختلفة.\n` +
      `ويمكنك أيضًا التقديم للإدارة من نفس البانل.`
    )
    .setFooter({ text: BOT_FOOTER });
}

function ticketButton(customId, label, emoji, style, enabled) {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(style)
    .setDisabled(!enabled);
}

function buildTicketsPanelRows() {
  const b = dataStore.system.buttons;

  return [
    new ActionRowBuilder().addComponents(
      ticketButton('ticket_support', 'دعم فني', '🎫', ButtonStyle.Primary, b.ticket_support),
      ticketButton('ticket_report', 'إبلاغ', '🚨', ButtonStyle.Danger, b.ticket_report),
      ticketButton('ticket_question', 'استفسار', '❓', ButtonStyle.Secondary, b.ticket_question)
    ),
    new ActionRowBuilder().addComponents(
      ticketButton('ticket_suggestion', 'اقتراح', '💡', ButtonStyle.Success, b.ticket_suggestion),
      ticketButton('ticket_partnership', 'شراكة', '🤝', ButtonStyle.Primary, b.ticket_partnership)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('apply_admin')
        .setLabel('📋 تقديم للإدارة')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!b.apply_admin)
    )
  ];
}

function buildDecisionPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle('📢 قرارات الإدارة')
    .setDescription(`هذا القسم مخصص للإدارة لإرسال رسالة لجميع الأعضاء في الخاص.`)
    .setFooter({ text: BOT_FOOTER });
}

function buildDecisionPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('open_decision_modal')
      .setLabel('📝 كتابة قرار / إرسال رسالة')
      .setStyle(ButtonStyle.Primary)
  );
}

function buildDashboardEmbed() {
  const b = dataStore.system.buttons;

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('⚙️ لوحة التحكم')
    .setDescription(
      `🎫 التذاكر العامة: ${dataStore.system.tickets ? '🟢 شغال' : '🔴 متوقف'}\n` +
      `📋 التقديمات العامة: ${dataStore.system.applications ? '🟢 شغال' : '🔴 متوقف'}\n\n` +
      `**أزرار التذاكر**\n` +
      `🎫 دعم: ${b.ticket_support ? '🟢' : '🔴'}\n` +
      `🚨 إبلاغ: ${b.ticket_report ? '🟢' : '🔴'}\n` +
      `❓ استفسار: ${b.ticket_question ? '🟢' : '🔴'}\n` +
      `💡 اقتراح: ${b.ticket_suggestion ? '🟢' : '🔴'}\n` +
      `🤝 شراكة: ${b.ticket_partnership ? '🟢' : '🔴'}\n` +
      `📋 تقديم إدارة: ${b.apply_admin ? '🟢' : '🔴'}\n\n` +
      `**أزرار التقديمات**\n` +
      `✅ قبول: ${b.accept_application ? '🟢' : '🔴'}\n` +
      `❌ رفض: ${b.reject_application ? '🟢' : '🔴'}\n` +
      `📅 تحديد موعد: ${b.set_appointment ? '🟢' : '🔴'}\n` +
      `🔄 تجديد موعد: ${b.renew_appointment ? '🟢' : '🔴'}`
    )
    .setFooter({ text: BOT_FOOTER });
}

function buildDashboardButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('toggle_tickets').setLabel('التذاكر العامة').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('toggle_apps').setLabel('التقديمات العامة').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('toggle_ticket_support').setLabel('دعم').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('toggle_ticket_report').setLabel('إبلاغ').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('toggle_ticket_question').setLabel('استفسار').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('toggle_ticket_suggestion').setLabel('اقتراح').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('toggle_ticket_partnership').setLabel('شراكة').setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('toggle_apply_admin').setLabel('تقديم').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('toggle_accept_application').setLabel('قبول').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('toggle_reject_application').setLabel('رفض').setStyle(ButtonStyle.Danger)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('toggle_set_appointment').setLabel('تحديد موعد').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('toggle_renew_appointment').setLabel('تجديد موعد').setStyle(ButtonStyle.Secondary)
    )
  ];
}

function buildTicketButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('claim_ticket')
        .setLabel('استلام التذكرة')
        .setEmoji('📌')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('transcript_ticket')
        .setLabel('نسخ المحادثة')
        .setEmoji('🧾')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('إغلاق التذكرة')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function buildApplicationActionRow(applicantId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_application_${applicantId}`)
        .setLabel('قبول')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!isButtonEnabled('accept_application')),
      new ButtonBuilder()
        .setCustomId(`reject_application_${applicantId}`)
        .setLabel('رفض')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!isButtonEnabled('reject_application')),
      new ButtonBuilder()
        .setCustomId(`set_appointment_${applicantId}`)
        .setLabel('تحديد موعد')
        .setEmoji('📅')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!isButtonEnabled('set_appointment')),
      new ButtonBuilder()
        .setCustomId(`renew_appointment_${applicantId}`)
        .setLabel('تجديد الموعد')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!isButtonEnabled('renew_appointment'))
    )
  ];
}

function buildFinalApplicationActionRow(accepted = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('application_done_accept')
        .setLabel(accepted ? 'تم القبول' : 'قبول')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('application_done_reject')
        .setLabel(accepted ? 'رفض' : 'تم الرفض')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('application_done_time')
        .setLabel('تحديد موعد')
        .setEmoji('📅')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('application_done_renew')
        .setLabel('تجديد الموعد')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    )
  ];
}

function buildRatingRow(ticketId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rate_${ticketId}_1`).setLabel('⭐').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`rate_${ticketId}_2`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rate_${ticketId}_3`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`rate_${ticketId}_4`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`rate_${ticketId}_5`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Success)
    )
  ];
}

/* =========================
   Panels
========================= */

async function panelExists(channel, title) {
  try {
    const messages = await channel.messages.fetch({ limit: 25 });
    return messages.some(
      (m) =>
        m.author.id === client.user.id &&
        m.embeds.length > 0 &&
        m.embeds[0].title === title
    );
  } catch {
    return false;
  }
}

async function sendWelcomePanel() {
  const welcomeChannel = await fetchChannel(WELCOME_CHANNEL_ID);
  if (!welcomeChannel) return;
  const exists = await panelExists(welcomeChannel, `👋 مرحبًا بك في ${BOT_NAME}`);
  if (exists) return;

  await welcomeChannel.send({
    embeds: [buildWelcomeEmbed()],
    components: [buildRulesButtonRow(GUILD_ID)]
  }).catch(() => {});
}

async function sendTicketsPanel() {
  const ticketsChannel = await fetchChannel(TICKETS_PANEL_CHANNEL_ID);
  if (!ticketsChannel) return;
  const exists = await panelExists(ticketsChannel, '🎫 نظام التذاكر');
  if (exists) return;

  await ticketsChannel.send({
    embeds: [buildTicketsPanelEmbed()],
    components: buildTicketsPanelRows()
  }).catch(() => {});
}

async function refreshTicketsPanel() {
  const ticketsChannel = await fetchChannel(TICKETS_PANEL_CHANNEL_ID);
  if (!ticketsChannel) return;

  try {
    const messages = await ticketsChannel.messages.fetch({ limit: 50 });
    const panelMessage = messages.find(
      (m) =>
        m.author.id === client.user.id &&
        m.embeds.length > 0 &&
        m.embeds[0].title === '🎫 نظام التذاكر'
    );

    if (panelMessage) {
      await panelMessage.edit({
        embeds: [buildTicketsPanelEmbed()],
        components: buildTicketsPanelRows()
      });
    }
  } catch {
    console.log('❌ Failed to refresh tickets panel');
  }
}

async function sendDecisionPanel() {
  const decisionChannel = await fetchChannel(DECISION_CHANNEL_ID);
  if (!decisionChannel) return;
  const exists = await panelExists(decisionChannel, '📢 قرارات الإدارة');
  if (exists) return;

  await decisionChannel.send({
    embeds: [buildDecisionPanelEmbed()],
    components: [buildDecisionPanelRow()]
  }).catch(() => {});
}

/* =========================
   Slash Commands
========================= */

async function registerSlashCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('setup')
      .setDescription('إرسال كل اللوحات')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
      .setName('panel-welcome')
      .setDescription('إرسال لوحة الترحيب')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
      .setName('panel-tickets')
      .setDescription('إرسال لوحة التذاكر')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
      .setName('panel-decisions')
      .setDescription('إرسال لوحة القرارات')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
      .setName('dashboard')
      .setDescription('لوحة التحكم')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
  ].map((cmd) => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands
    });
    console.log('✅ Slash commands registered');
  } catch (error) {
    console.error('❌ Slash command registration error:', error);
  }
}

/* =========================
   Admin application
========================= */

async function startAdminApplication(interaction) {
  const user = interaction.user;
  const reviewChannel = await fetchChannel(APPLICATION_REVIEW_CHANNEL_ID);

  if (!reviewChannel) {
    return interaction.reply({
      content: '❌ تشانل مراجعة التقديمات غير موجود.',
      ephemeral: true
    });
  }

  await interaction.reply({
    content: '📩 تم بدء التقديم. افتح الخاص DM وأجب على الأسئلة.',
    ephemeral: true
  });

  const dm = await user.createDM();
  const filter = (m) => m.author.id === user.id;

  const questions = [
    { key: 'full_name', question: '📌 ما الاسم الكامل؟', minWords: 2, shortError: '❌ الاسم الكامل قصير جدًا.' },
    {
      key: 'email',
      question: '📧 ما هو البريد الإلكتروني الخاص بك؟',
      validate(answer) {
        if (!isValidEmail(answer)) return '❌ الإيميل غير صحيح.';
        return null;
      }
    },
    {
      key: 'age',
      question: '🎂 كم عمرك؟',
      validate(answer) {
        const age = parseInt(answer, 10);
        if (Number.isNaN(age)) return '❌ العمر يجب أن يكون رقمًا.';
        if (age < 18) return '❌ تحت السن المطلوب (18+).';
        return null;
      }
    },
    { key: 'country_city', question: '🌍 من أي دولة / مدينة؟', minWords: 2, shortError: '❌ الإجابة قصيرة.' },
    { key: 'hours', question: '⏰ كم ساعة تقدر تتواجد يوميًا؟', minWords: 2, shortError: '❌ الإجابة قصيرة.' },
    { key: 'experience', question: '🧠 ما خبرتك السابقة في الإدارة؟', minWords: 4, shortError: '❌ الإجابة قصيرة.' },
    { key: 'why_admin', question: '📋 لماذا تريد الانضمام للإدارة؟', minWords: 4, shortError: '❌ الإجابة قصيرة.' },
    { key: 'problem_handling', question: '🛠️ كيف تتعامل مع المشاكل أو الخلافات؟', minWords: 4, shortError: '❌ الإجابة قصيرة.' },
    { key: 'special', question: '⭐ ما الذي يميزك عن غيرك؟', minWords: 4, shortError: '❌ الإجابة قصيرة.' },
    { key: 'server_rules', question: '📚 هل قرأت قوانين السيرفر وتفهمها؟ اشرح بشكل مختصر.', minWords: 4, shortError: '❌ الإجابة قصيرة.' },
    { key: 'activity_days', question: '📅 في أي أيام تكون متواجد أكثر؟', minWords: 2, shortError: '❌ الإجابة قصيرة.' }
  ];

  const answers = {};

  try {
    await dm.send(
      `📋 **بدأ التقديم على الإدارة**\n\n` +
      `سيتم سؤالك سؤالًا واحدًا في كل مرة.`
    );

    for (const q of questions) {
      await dm.send(q.question);

      const collected = await dm.awaitMessages({
        filter,
        max: 1,
        time: 180000,
        errors: ['time']
      });

      const answer = collected.first().content.trim();

      if (q.validate) {
        const err = q.validate(answer);
        if (err) {
          await dm.send(`❌ ${err}`);
          await reviewChannel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('❌ تم رفض تقديم تلقائيًا')
                .setDescription(`**المتقدم:** ${user.tag}\n**السبب:** ${err}`)
                .setFooter({ text: BOT_FOOTER })
            ]
          }).catch(() => {});
          return;
        }
      }

      if (q.minWords && countWords(answer) < q.minWords) {
        await dm.send(q.shortError);
        await reviewChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('❌ تم رفض تقديم تلقائيًا')
              .setDescription(`**المتقدم:** ${user.tag}\n**السبب:** ${q.shortError}`)
              .setFooter({ text: BOT_FOOTER })
          ]
        }).catch(() => {});
        return;
      }

      answers[q.key] = answer;
    }

    setApplicationData(user.id, {
      email: answers.email,
      appointment: null,
      username: user.username,
      full_name: answers.full_name,
      age: answers.age,
      country_city: answers.country_city,
      hours: answers.hours,
      experience: answers.experience,
      why_admin: answers.why_admin,
      problem_handling: answers.problem_handling,
      special: answers.special,
      server_rules: answers.server_rules,
      activity_days: answers.activity_days,
      status: 'pending'
    });

    const reviewEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 تقديم جديد للإدارة')
      .setDescription(`**المتقدم:** ${user.tag}\n**User ID:** ${user.id}`)
      .addFields(
        { name: 'الاسم الكامل', value: answers.full_name || 'غير موجود' },
        { name: 'البريد الإلكتروني', value: answers.email || 'غير موجود' },
        { name: 'العمر', value: answers.age || 'غير موجود' },
        { name: 'الدولة / المدينة', value: answers.country_city || 'غير موجود' },
        { name: 'ساعات التواجد', value: answers.hours || 'غير موجود' },
        { name: 'الخبرة السابقة', value: answers.experience || 'غير موجود' },
        { name: 'لماذا يريد الإدارة', value: answers.why_admin || 'غير موجود' },
        { name: 'كيف يتعامل مع المشاكل', value: answers.problem_handling || 'غير موجود' },
        { name: 'ما الذي يميزه', value: answers.special || 'غير موجود' },
        { name: 'فهم القوانين', value: answers.server_rules || 'غير موجود' },
        { name: 'أيام النشاط', value: answers.activity_days || 'غير موجود' },
        { name: 'موعد المقابلة الصوتية', value: 'لم يتم تحديده بعد' }
      )
      .setFooter({ text: BOT_FOOTER });

    await reviewChannel.send({
      embeds: [reviewEmbed],
      components: buildApplicationActionRow(user.id)
    });

    await dm.send('✅ تم إرسال تقديمك إلى الإدارة بنجاح.');
    await sendLog(`📋 تم إرسال تقديم إدارة جديد بواسطة ${user.tag}`);
  } catch {
    await dm.send('❌ انتهى وقت التقديم أو حدث خطأ.').catch(() => {});
  }
}

/* =========================
   Ready
========================= */

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await registerSlashCommands();
  await sendWelcomePanel();
  await sendTicketsPanel();
  await sendDecisionPanel();
  await sendLog('✅ تم تشغيل البوت.');
});

/* =========================
   New member
========================= */

client.on(Events.GuildMemberAdd, async (member) => {
  const welcomeChannel = await fetchChannel(WELCOME_CHANNEL_ID);

  try {
    await member.roles.add(PLAYER_ROLE_ID);
  } catch {
    console.log('❌ فشل إعطاء رول Player');
  }

  if (!welcomeChannel) return;

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('✨ عضو جديد')
    .setDescription(
      `مرحبًا بك ${member} في **${BOT_NAME}** 🌆\n\n` +
      `تم إعطاؤك رتبة Player 🎮`
    )
    .setFooter({ text: BOT_FOOTER });

  await welcomeChannel.send({
    embeds: [embed],
    components: [buildRulesButtonRow(member.guild.id)]
  }).catch(() => {});
});

/* =========================
   Interactions
========================= */

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    /* ===== Slash ===== */
    if (interaction.isChatInputCommand()) {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({ content: '❌ هذا الأمر للإدارة فقط.', ephemeral: true });
      }

      if (interaction.commandName === 'setup') {
        await sendWelcomePanel();
        await sendTicketsPanel();
        await sendDecisionPanel();
        return interaction.reply({ content: '✅ تم إرسال كل اللوحات.', ephemeral: true });
      }

      if (interaction.commandName === 'panel-welcome') {
        await sendWelcomePanel();
        return interaction.reply({ content: '✅ تم إرسال لوحة الترحيب.', ephemeral: true });
      }

      if (interaction.commandName === 'panel-tickets') {
        await sendTicketsPanel();
        return interaction.reply({ content: '✅ تم إرسال لوحة التذاكر.', ephemeral: true });
      }

      if (interaction.commandName === 'panel-decisions') {
        await sendDecisionPanel();
        return interaction.reply({ content: '✅ تم إرسال لوحة القرارات.', ephemeral: true });
      }

      if (interaction.commandName === 'dashboard') {
        return interaction.reply({
          embeds: [buildDashboardEmbed()],
          components: buildDashboardButtons(),
          ephemeral: true
        });
      }
    }

    /* ===== Dashboard ===== */
    const dashboardMap = {
      toggle_ticket_support: 'ticket_support',
      toggle_ticket_report: 'ticket_report',
      toggle_ticket_question: 'ticket_question',
      toggle_ticket_suggestion: 'ticket_suggestion',
      toggle_ticket_partnership: 'ticket_partnership',
      toggle_apply_admin: 'apply_admin',
      toggle_accept_application: 'accept_application',
      toggle_reject_application: 'reject_application',
      toggle_set_appointment: 'set_appointment',
      toggle_renew_appointment: 'renew_appointment'
    };

    if (interaction.isButton() && interaction.customId === 'toggle_tickets') {
      if (!isAdmin(interaction.member)) return interaction.reply({ content: '❌ للإدارة فقط.', ephemeral: true });
      dataStore.system.tickets = !dataStore.system.tickets;
      saveData(dataStore);
      await refreshTicketsPanel();
      return interaction.update({ embeds: [buildDashboardEmbed()], components: buildDashboardButtons() });
    }

    if (interaction.isButton() && interaction.customId === 'toggle_apps') {
      if (!isAdmin(interaction.member)) return interaction.reply({ content: '❌ للإدارة فقط.', ephemeral: true });
      dataStore.system.applications = !dataStore.system.applications;
      saveData(dataStore);
      await refreshTicketsPanel();
      return interaction.update({ embeds: [buildDashboardEmbed()], components: buildDashboardButtons() });
    }

    if (interaction.isButton() && dashboardMap[interaction.customId]) {
      if (!isAdmin(interaction.member)) return interaction.reply({ content: '❌ للإدارة فقط.', ephemeral: true });
      toggleButtonSetting(dashboardMap[interaction.customId]);
      await refreshTicketsPanel();
      return interaction.update({ embeds: [buildDashboardEmbed()], components: buildDashboardButtons() });
    }

    /* ===== Start application ===== */
    if (interaction.isButton() && interaction.customId === 'apply_admin') {
      if (!dataStore.system.applications || !isButtonEnabled('apply_admin')) {
        return interaction.reply({ content: '❌ التقديمات متوقفة حالياً.', ephemeral: true });
      }
      return startAdminApplication(interaction);
    }

    /* ===== Open ticket ===== */
    if (interaction.isButton() && TICKET_TYPES[interaction.customId]) {
      if (!dataStore.system.tickets) {
        return interaction.reply({ content: '❌ نظام التذاكر متوقف حالياً.', ephemeral: true });
      }
      if (!isButtonEnabled(interaction.customId)) {
        return interaction.reply({ content: '❌ هذا الزر متوقف حالياً.', ephemeral: true });
      }

      const ticketInfo = TICKET_TYPES[interaction.customId];
      const guild = interaction.guild;

      const existingChannel = guild.channels.cache.find((ch) => {
        return (
          ch.parentId === ticketInfo.categoryId &&
          ch.topic &&
          ch.topic.includes(`OWNER:${interaction.user.id}`) &&
          ch.topic.includes(`TYPE:${interaction.customId}`)
        );
      });

      if (existingChannel) {
        return interaction.reply({
          content: `❌ لديك بالفعل تذكرة مفتوحة من هذا النوع: ${existingChannel}`,
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const ticketId = getNextTicketId();
      const channelName = `${ticketInfo.prefix}-${ticketId}`;

      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: ticketInfo.categoryId,
        topic: `OWNER:${interaction.user.id} | TYPE:${interaction.customId} | ID:${ticketId}`,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          {
            id: client.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.EmbedLinks,
              PermissionsBitField.Flags.AttachFiles
            ]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          },
          {
            id: ADMIN_ROLE_ID,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageChannels
            ]
          },
          {
            id: SUPPORT_ROLE_ID,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          }
        ]
      });

      const ticketEmbed = new EmbedBuilder()
        .setColor(ticketInfo.color)
        .setTitle(`${ticketInfo.emoji} ${ticketInfo.label} #${ticketId}`)
        .setDescription(
          `مرحبًا ${interaction.user}\n\n` +
          `تم فتح تذكرتك بنجاح.\n` +
          `يرجى كتابة التفاصيل بوضوح.`
        )
        .addFields(
          { name: 'رقم التذكرة', value: `#${ticketId}`, inline: true },
          { name: 'نوع التذكرة', value: ticketInfo.label, inline: true },
          { name: 'صاحب التذكرة', value: interaction.user.tag, inline: true }
        )
        .setFooter({ text: BOT_FOOTER });

      await ticketChannel.send({
        content: `${interaction.user} <@&${SUPPORT_ROLE_ID}>`,
        embeds: [ticketEmbed],
        components: buildTicketButtons()
      }).catch(() => {});

      await sendLog(
        `📂 تم فتح تذكرة جديدة\n` +
        `رقم التذكرة: #${ticketId}\n` +
        `العضو: ${interaction.user.tag}\n` +
        `النوع: ${ticketInfo.label}\n` +
        `القناة: ${ticketChannel}`
      );

      return interaction.editReply({ content: `✅ تم فتح التذكرة بنجاح: ${ticketChannel}` });
    }

    /* ===== Claim ===== */
    if (interaction.isButton() && interaction.customId === 'claim_ticket') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: '❌ فقط الإدارة أو الدعم يمكنهم استلام التذكرة.', ephemeral: true });
      }

      const claimedBy = claimedTickets.get(interaction.channel.id);
      if (claimedBy) {
        return interaction.reply({
          content: `❌ هذه التذكرة مستلمة بالفعل بواسطة <@${claimedBy}>`,
          ephemeral: true
        });
      }

      claimedTickets.set(interaction.channel.id, interaction.user.id);
      await interaction.reply({ content: `📌 تم استلام التذكرة بواسطة ${interaction.user}` });
      await sendLog(`📌 تم استلام تذكرة ${interaction.channel.name} بواسطة ${interaction.user.tag}`);
      return;
    }

    /* ===== Transcript ===== */
    if (interaction.isButton() && interaction.customId === 'transcript_ticket') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: '❌ فقط الإدارة أو الدعم يمكنهم نسخ المحادثة.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const buffer = await createTranscript(interaction.channel);
      const file = new AttachmentBuilder(buffer, {
        name: `${interaction.channel.name}-transcript.txt`
      });

      await interaction.editReply({
        content: '✅ تم إنشاء نسخة من المحادثة.',
        files: [file]
      });

      await sendLog(`🧾 تم إنشاء Transcript في ${interaction.channel.name} بواسطة ${interaction.user.tag}`);
      return;
    }

    /* ===== Close ticket ===== */
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: '❌ فقط الإدارة أو الدعم يمكنهم إغلاق التذكرة.', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId('close_ticket_modal')
        .setTitle('إغلاق التذكرة');

      const reasonInput = new TextInputBuilder()
        .setCustomId('close_reason')
        .setLabel('اكتب سبب إغلاق التذكرة')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'close_ticket_modal') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: '❌ هذا الإجراء خاص بالإدارة أو الدعم.', ephemeral: true });
      }

      const reason = interaction.fields.getTextInputValue('close_reason').trim();
      const parsed = parseTicketTopic(interaction.channel.topic);
      const ownerId = parsed.ownerId;
      const ticketId = parsed.ticketId || 'غير معروف';

      try {
        const user = await client.users.fetch(ownerId);

        const dmEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('🔒 تم إغلاق تذكرتك')
          .setDescription(
            `🎫 رقم التذكرة: **#${ticketId}**\n\n` +
            `📄 السبب:\n${reason}`
          )
          .setFooter({ text: BOT_FOOTER });

        await user.send({ embeds: [dmEmbed] });
        await user.send({
          content: `⭐ قيّم تجربتك مع التذكرة #${ticketId}`,
          components: buildRatingRow(ticketId)
        });
      } catch {}

      await interaction.reply({ content: '🔒 سيتم حذف التذكرة خلال 5 ثوانٍ...' });
      await sendLog(`🔒 تم إغلاق تذكرة #${ticketId} بواسطة ${interaction.user.tag}`);

      setTimeout(async () => {
        claimedTickets.delete(interaction.channel.id);
        await interaction.channel.delete().catch(() => {});
      }, 5000);

      return;
    }

    /* ===== Rating ===== */
    if (interaction.isButton() && interaction.customId.startsWith('rate_')) {
      const parts = interaction.customId.split('_');
      const ticketId = parts[1];
      const stars = parts[2];

      const modal = new ModalBuilder()
        .setCustomId(`rate_reason_${ticketId}_${stars}`)
        .setTitle('سبب التقييم');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('اكتب سبب التقييم')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('rate_reason_')) {
      const parts = interaction.customId.split('_');
      const ticketId = parts[2];
      const stars = parts[3];
      const reason = interaction.fields.getTextInputValue('reason').trim();

      const reviewChannel = await fetchChannel(REVIEW_CHANNEL_ID);
      if (reviewChannel) {
        const reviewEmbed = new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle('⭐ تقييم جديد')
          .addFields(
            { name: 'رقم التذكرة', value: `#${ticketId}`, inline: true },
            { name: 'التقييم', value: '⭐'.repeat(Number(stars)), inline: true },
            { name: 'السبب', value: reason },
            { name: 'العضو', value: interaction.user.tag }
          )
          .setFooter({ text: BOT_FOOTER });

        await reviewChannel.send({ embeds: [reviewEmbed] }).catch(() => {});
      }

      return interaction.reply({ content: '✅ شكراً لتقييمك.', ephemeral: true });
    }

    /* ===== Decisions ===== */
    if (interaction.isButton() && interaction.customId === 'open_decision_modal') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({ content: '❌ هذا الزر خاص بالإدارة فقط.', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId('decision_modal')
        .setTitle('إرسال قرار إداري');

      const messageInput = new TextInputBuilder()
        .setCustomId('decision_message')
        .setLabel('اكتب الرسالة التي ستصل لكل الأعضاء')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(messageInput));
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'decision_modal') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({ content: '❌ هذا الإجراء خاص بالإدارة فقط.', ephemeral: true });
      }

      const messageValue = interaction.fields.getTextInputValue('decision_message').trim();
      await interaction.reply({ content: '📢 جاري إرسال الرسالة...', ephemeral: true });

      let success = 0;
      let failed = 0;
      const members = await interaction.guild.members.fetch();

      for (const [, member] of members) {
        if (member.user.bot) continue;
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle(`📢 رسالة من إدارة ${BOT_NAME}`)
            .setDescription(`👋 أهلاً يا **${member.user.username}**\n\n${messageValue}`)
            .setFooter({ text: BOT_FOOTER });

          await member.send({ embeds: [dmEmbed] });
          success++;
        } catch {
          failed++;
        }
      }

      await sendLog(`📨 Broadcast by ${interaction.user.tag} | success: ${success} | failed: ${failed}`);
      return interaction.followUp({
        content: `✅ تم إرسال الرسالة.\nنجح: ${success}\nفشل: ${failed}`,
        ephemeral: true
      });
    }

    /* ===== Set / renew appointment ===== */
    if (
      interaction.isButton() &&
      (
        interaction.customId.startsWith('set_appointment_') ||
        interaction.customId.startsWith('renew_appointment_')
      )
    ) {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: '❌ هذا الزر للإدارة فقط.', ephemeral: true });
      }

      const applicantId = interaction.customId
        .replace('set_appointment_', '')
        .replace('renew_appointment_', '');

      const renew = interaction.customId.startsWith('renew_appointment_');

      if (renew && !isButtonEnabled('renew_appointment')) {
        return interaction.reply({ content: '❌ زر تجديد الموعد متوقف حالياً.', ephemeral: true });
      }

      if (!renew && !isButtonEnabled('set_appointment')) {
        return interaction.reply({ content: '❌ زر تحديد الموعد متوقف حالياً.', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId(`${renew ? 'renew' : 'set'}_appointment_modal_${applicantId}`)
        .setTitle(renew ? 'تجديد موعد المقابلة الصوتية' : 'تحديد موعد المقابلة الصوتية');

      const input = new TextInputBuilder()
        .setCustomId('appointment_value')
        .setLabel('اكتب الموعد')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (
      interaction.isModalSubmit() &&
      (
        interaction.customId.startsWith('set_appointment_modal_') ||
        interaction.customId.startsWith('renew_appointment_modal_')
      )
    ) {
      await interaction.deferUpdate();

      const applicantId = interaction.customId
        .replace('set_appointment_modal_', '')
        .replace('renew_appointment_modal_', '');

      const appointmentValue = interaction.fields.getTextInputValue('appointment_value').trim();
      const oldData = getApplicationData(applicantId) || {};

      setApplicationData(applicantId, { appointment: appointmentValue });

      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
      const fields = (updatedEmbed.data.fields || []).filter(
        (f) => f.name !== 'موعد المقابلة الصوتية'
      );
      updatedEmbed.setFields([...fields, { name: 'موعد المقابلة الصوتية', value: appointmentValue }]);

      await interaction.message.edit({
        embeds: [updatedEmbed],
        components: buildApplicationActionRow(applicantId)
      });

      const user = await client.users.fetch(applicantId).catch(() => null);
      if (user) {
        await user.send(
          `📅 **تم تحديث موعد المقابلة الصوتية**\n\n${appointmentValue}`
        ).catch(() => {});
      }

      if (oldData.email && isValidEmail(oldData.email)) {
        await sendEmail(
          oldData.email,
          'تحديد / تجديد موعد المقابلة الصوتية',
          buildAcceptEmailHtml(oldData.username || 'Member', appointmentValue)
        );
      }

      await sendLog(`📅 تم تحديث موعد ${applicantId} إلى ${appointmentValue} بواسطة ${interaction.user.tag}`);
      return;
    }

    /* ===== Accept ===== */
    if (interaction.isButton() && interaction.customId.startsWith('accept_application_')) {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: '❌ هذا الزر للإدارة فقط.', ephemeral: true });
      }

      if (!isButtonEnabled('accept_application')) {
        return interaction.reply({ content: '❌ زر القبول متوقف حالياً.', ephemeral: true });
      }

      await interaction.deferUpdate();

      const applicantId = interaction.customId.replace('accept_application_', '');
      const member = await interaction.guild.members.fetch(applicantId).catch(() => null);

      if (!member) {
        return interaction.followUp({ content: '❌ لم أجد العضو داخل السيرفر.', ephemeral: true });
      }

      const appData = getApplicationData(applicantId) || {};

      const processingEmbed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('⏳ جاري قبول التقديم...')
        .setDescription(`👤 **المتقدم:** <@${applicantId}>\n🛡️ **بواسطة:** ${interaction.user.tag}`)
        .setFooter({ text: BOT_FOOTER });

      await interaction.message.edit({
        embeds: [processingEmbed],
        components: buildFinalApplicationActionRow(true)
      }).catch(() => {});

      for (const roleId of APPROVED_ADMIN_ROLE_IDS) {
        await member.roles.add(roleId).catch(() => {});
      }

      const acceptedDM = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🎉 تم قبولك في الإدارة')
        .setDescription(
          `مرحبًا ${member}\n\n` +
          `✅ تم قبولك في **${BOT_NAME}**\n\n` +
          `📅 موعد المقابلة الصوتية:\n**${appData.appointment || 'سيتم تحديده قريبًا'}**`
        )
        .setImage(SERVER_LOGO)
        .setFooter({ text: BOT_FOOTER });

      await member.send({ embeds: [acceptedDM] }).catch(() => {});

      if (appData.email && isValidEmail(appData.email)) {
        await sendEmail(
          appData.email,
          'تم قبولك في Night City Community',
          buildAcceptEmailHtml(member.user.username, appData.appointment || 'سيتم تحديده قريبًا')
        );
      }

      setApplicationData(applicantId, { status: 'accepted' });

      const acceptedReview = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ تم قبول التقديم')
        .setDescription(
          `👤 **المتقدم:** <@${applicantId}>\n` +
          `🛡️ **تم بواسطة:** ${interaction.user.tag}\n` +
          `📅 **موعد المقابلة الصوتية:** ${appData.appointment || 'غير محدد'}`
        )
        .setThumbnail(SERVER_LOGO)
        .setFooter({ text: BOT_FOOTER });

      await interaction.message.edit({
        embeds: [acceptedReview],
        components: buildFinalApplicationActionRow(true)
      });

      await sendLog(`✅ تم قبول ${member.user.tag} بواسطة ${interaction.user.tag}`);
      return;
    }

    /* ===== Reject ===== */
    if (interaction.isButton() && interaction.customId.startsWith('reject_application_')) {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: '❌ هذا الزر للإدارة فقط.', ephemeral: true });
      }

      if (!isButtonEnabled('reject_application')) {
        return interaction.reply({ content: '❌ زر الرفض متوقف حالياً.', ephemeral: true });
      }

      const applicantId = interaction.customId.replace('reject_application_', '');

      const modal = new ModalBuilder()
        .setCustomId(`reject_application_reason_${applicantId}`)
        .setTitle('سبب رفض التقديم');

      const reasonInput = new TextInputBuilder()
        .setCustomId('reject_reason')
        .setLabel('اكتب سبب الرفض')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('reject_application_reason_')) {
      await interaction.deferUpdate();

      const applicantId = interaction.customId.replace('reject_application_reason_', '');
      const reason = interaction.fields.getTextInputValue('reject_reason').trim();
      const appData = getApplicationData(applicantId) || {};

      const processingEmbed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('⏳ جاري رفض التقديم...')
        .setDescription(`👤 **المتقدم:** <@${applicantId}>\n🛡️ **بواسطة:** ${interaction.user.tag}`)
        .setFooter({ text: BOT_FOOTER });

      await interaction.message.edit({
        embeds: [processingEmbed],
        components: buildFinalApplicationActionRow(false)
      }).catch(() => {});

      const user = await client.users.fetch(applicantId).catch(() => null);
      if (user) {
        const rejectedDM = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('❌ تم رفض طلبك')
          .setDescription(`📄 سبب الرفض:\n${reason}`)
          .setImage(SERVER_LOGO)
          .setFooter({ text: BOT_FOOTER });

        await user.send({ embeds: [rejectedDM] }).catch(() => {});
      }

      if (appData.email && isValidEmail(appData.email)) {
        await sendEmail(
          appData.email,
          'تم رفض طلبك في Night City Community',
          buildRejectEmailHtml(appData.username || 'Member', reason)
        );
      }

      setApplicationData(applicantId, { status: 'rejected' });

      const rejectedReview = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('❌ تم رفض التقديم')
        .setDescription(
          `👤 **المتقدم:** <@${applicantId}>\n` +
          `🛡️ **تم بواسطة:** ${interaction.user.tag}\n` +
          `📄 **سبب الرفض:** ${reason}`
        )
        .setThumbnail(SERVER_LOGO)
        .setFooter({ text: BOT_FOOTER });

      await interaction.message.edit({
        embeds: [rejectedReview],
        components: buildFinalApplicationActionRow(false)
      });

      await sendLog(`❌ تم رفض ${applicantId} بواسطة ${interaction.user.tag} | السبب: ${reason}`);
      return;
    }
  } catch (error) {
    console.error('❌ Interaction error:', error);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ حدث خطأ أثناء تنفيذ العملية.',
        ephemeral: true
      }).catch(() => {});
    } else if (interaction.isRepliable() && interaction.deferred && !interaction.replied) {
      await interaction.editReply({
        content: '❌ حدث خطأ أثناء تنفيذ العملية.'
      }).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);
