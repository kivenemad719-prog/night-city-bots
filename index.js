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
   IDs - حطهم هنا
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

const CATEGORY_SUPPORT_ID = '1484041614320996413';
const CATEGORY_REPORTS_ID = '1484041819330183279';
const CATEGORY_QUESTIONS_ID = '1484042095306997830';
const CATEGORY_SUGGESTIONS_ID = '1484042283673190491';
const CATEGORY_PARTNERSHIP_ID = '1484042422626422845';

/* =========================
   IDs جديدة
========================= */

const REVIEW_CHANNEL_ID = '1484303917998276648';
const APPLICATION_REVIEW_CHANNEL_ID = '1484304595730829352';

const APPROVED_ADMIN_ROLE_IDS = [
  '1484244769566752819',
  '1484244554176663572',
  '1484040156318138390',
  '1484040249788207175'
];

/* =========================
   إعدادات البوت
========================= */

const CLIENT_ID = '1484035052198428843';
const BOT_NAME = 'Night City Community';
const BOT_FOOTER = 'Night City Community System';

/* =========================
   إعدادات الإيميل داخل index.js
========================= */

const EMAIL_USER = 'nightcity12600@gmail.com';
const EMAIL_PASS = 'Plus10700';
const SERVER_LOGO = 'PUT_SERVER_LOGO_LINK_HERE';
const SERVER_NAME = 'Night City Community';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: `"${BOT_NAME}" <${EMAIL_USER}>`,
      to,
      subject,
      html
    });
  } catch (err) {
    console.log('❌ Email Error:', err.message);
  }
}

/* =========================
   Data file
========================= */

const DATA_FILE = path.join(__dirname, 'bot-data.json');

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return {
        ticketCounter: 1,
        applications: {},
        system: {
          tickets: true,
          applications: true
        }
      };
    }

    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);

    if (!parsed.ticketCounter) parsed.ticketCounter = 1;
    if (!parsed.applications) parsed.applications = {};
    if (!parsed.system) {
      parsed.system = {
        tickets: true,
        applications: true
      };
    }

    return parsed;
  } catch {
    return {
      ticketCounter: 1,
      applications: {},
      system: {
        tickets: true,
        applications: true
      }
    };
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
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
   أنواع التذاكر
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

/* =========================
   تخزين مؤقت
========================= */

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

function sanitizeName(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '')
      .slice(0, 12) || 'user'
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setApplicationData(userId, payload) {
  if (!dataStore.applications) dataStore.applications = {};
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

function isAdmin(member) {
  return member?.roles?.cache?.has(ADMIN_ROLE_ID);
}

function isSupport(member) {
  return member?.roles?.cache?.has(SUPPORT_ROLE_ID);
}

function isStaff(member) {
  return isAdmin(member) || isSupport(member);
}

function buildRulesButtonRow(guildId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('📜 الدخول إلى القوانين')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/channels/${guildId}/${RULES_CHANNEL_ID}`)
  );
}

function buildWelcomeEmbed() {
  return new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle(`👋 مرحبًا بك في ${BOT_NAME}`)
    .setDescription(
      `مرحبًا بك في سيرفر **${BOT_NAME}** 🌆\n\n` +
      `نتمنى لك وقتًا ممتعًا معنا.\n` +
      `يرجى قراءة القوانين أولًا قبل التفاعل داخل السيرفر.`
    )
    .setFooter({ text: BOT_FOOTER });
}

function buildTicketsPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎫 نظام التذاكر')
    .setDescription(
      `اختر نوع التذكرة المناسب من الأزرار بالأسفل.\n\n` +
      `كل نوع تذكرة يفتح في **كاتيجوري مختلفة** تلقائيًا.\n` +
      `يمكنك أيضًا التقديم للإدارة من نفس البانل.`
    )
    .setFooter({ text: BOT_FOOTER });
}

function buildTicketsPanelRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_support')
      .setLabel('دعم فني')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ticket_report')
      .setLabel('إبلاغ')
      .setEmoji('🚨')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket_question')
      .setLabel('استفسار')
      .setEmoji('❓')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_suggestion')
      .setLabel('اقتراح')
      .setEmoji('💡')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('ticket_partnership')
      .setLabel('شراكة')
      .setEmoji('🤝')
      .setStyle(ButtonStyle.Primary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('apply_admin')
      .setLabel('📋 تقديم للإدارة')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2, row3];
}

function buildDecisionPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle('📢 قرارات الإدارة')
    .setDescription(
      `هذا القسم مخصص للإدارة لإرسال الرسائل إلى جميع أعضاء السيرفر.\n\n` +
      `عند الضغط على الزر، ستكتب الرسالة مرة واحدة، ثم يقوم البوت بإرسالها **لكل الأعضاء** في الخاص، مع كتابة اسم كل عضو داخل رسالته تلقائيًا.`
    )
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
  return new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle('⚙️ لوحة التحكم')
    .setDescription(
      `🎫 حالة التذاكر: ${dataStore.system.tickets ? '🟢 شغال' : '🔴 متوقف'}\n` +
      `📋 حالة التقديمات: ${dataStore.system.applications ? '🟢 شغال' : '🔴 متوقف'}`
    )
    .setFooter({ text: BOT_FOOTER });
}

function buildDashboardButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('toggle_tickets')
        .setLabel('تشغيل/إيقاف التذاكر')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('toggle_apps')
        .setLabel('تشغيل/إيقاف التقديمات')
        .setStyle(ButtonStyle.Secondary)
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
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject_application_${applicantId}`)
        .setLabel('رفض')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`set_appointment_${applicantId}`)
        .setLabel('تحديد موعد')
        .setEmoji('📅')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`renew_appointment_${applicantId}`)
        .setLabel('تجديد الموعد')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary)
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
      new ButtonBuilder()
        .setCustomId(`rate_${ticketId}_1`)
        .setLabel('⭐')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`rate_${ticketId}_2`)
        .setLabel('⭐⭐')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`rate_${ticketId}_3`)
        .setLabel('⭐⭐⭐')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`rate_${ticketId}_4`)
        .setLabel('⭐⭐⭐⭐')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`rate_${ticketId}_5`)
        .setLabel('⭐⭐⭐⭐⭐')
        .setStyle(ButtonStyle.Success)
    )
  ];
}

function buildAcceptEmailHtml(username, appointmentText) {
  return `
  <div style="font-family:Arial,sans-serif;background:#edf0f5;padding:20px;direction:rtl;text-align:right;">
    <div style="max-width:700px;margin:auto;background:#f5f7fb;border-radius:18px;overflow:hidden;border:1px solid #cfd8e3;">
      <div style="background:#cfeaf5;padding:30px;text-align:center;border-bottom:4px solid #4f91ad;">
        <img src="${SERVER_LOGO}" alt="logo" width="180" style="border-radius:50%;display:block;margin:auto;">
        <h1 style="margin:20px 0 0;color:#0d617f;font-size:52px;">🎉 تم قبول طلبك!</h1>
        <div style="margin-top:18px;font-size:30px;font-weight:bold;color:#163a52;">
          <span style="background:#f3d77a;padding:2px 8px;">${SERVER_NAME}</span>
        </div>
      </div>

      <div style="padding:35px 40px;color:#33566a;font-size:22px;line-height:2;">
        <p>مرحبًا <strong style="color:#0d617f;">${username}</strong>،</p>
        <p>
          نود إعلامك بأن طلبك للانضمام إلى
          <strong><span style="background:#f3d77a;padding:2px 8px;">${SERVER_NAME}</span></strong>
          قد تم قبوله بنجاح 🎊
        </p>

        <div style="background:#d9eef7;border-radius:18px;padding:25px;margin:25px 0;border-right:8px solid #0d617f;">
          <h2 style="margin-top:0;color:#0d617f;">📅 موعد المقابلة الصوتية</h2>
          <div style="font-size:21px;color:#355667;">
            ${appointmentText || 'سيتم تحديد الموعد قريبًا.'}
          </div>
        </div>

        <div style="background:#eef4fb;border:1px solid #c9d6e4;border-radius:18px;padding:25px;">
          <h2 style="margin-top:0;color:#0d617f;">📋 الخطوات التالية:</h2>
          <ul style="padding-right:20px;line-height:2;">
            <li>🎙️ إجراء المقابلة الصوتية مع الإدارة</li>
            <li>📌 التأكد من تواجدك في الوقت المحدد</li>
            <li>🎤 التأكد من أن الميكروفون يعمل بشكل صحيح</li>
            <li>📜 الالتزام بقوانين السيرفر</li>
          </ul>
        </div>

        <p style="text-align:center;margin-top:30px;font-size:24px;">
          🚀 نتمنى لك تجربة ممتعة معنا
        </p>
      </div>

      <div style="border-top:1px solid #cfd8e3;padding:20px;text-align:center;color:#5b7890;font-size:18px;">
        <strong><span style="background:#f3d77a;padding:2px 8px;">${SERVER_NAME}</span></strong>
        — هذا إيميل تلقائي من
        <br>© 2026 ${SERVER_NAME}. جميع الحقوق محفوظة.
      </div>
    </div>
  </div>
  `;
}

function buildRejectEmailHtml(username, reason) {
  return `
  <div style="font-family:Arial,sans-serif;background:#edf0f5;padding:20px;direction:rtl;text-align:right;">
    <div style="max-width:700px;margin:auto;background:#f5f7fb;border-radius:18px;overflow:hidden;border:1px solid #cfd8e3;">
      <div style="background:#f4d7d7;padding:30px;text-align:center;border-bottom:4px solid #c04848;">
        <img src="${SERVER_LOGO}" alt="logo" width="180" style="border-radius:50%;display:block;margin:auto;">
        <h1 style="margin:20px 0 0;color:#8a1f1f;font-size:52px;">❌ تم رفض الطلب</h1>
        <div style="margin-top:18px;font-size:30px;font-weight:bold;color:#163a52;">
          <span style="background:#f3d77a;padding:2px 8px;">${SERVER_NAME}</span>
        </div>
      </div>

      <div style="padding:35px 40px;color:#33566a;font-size:22px;line-height:2;">
        <p>مرحبًا <strong style="color:#8a1f1f;">${username}</strong>،</p>
        <p>
          نود إعلامك بأن طلبك للانضمام إلى
          <strong><span style="background:#f3d77a;padding:2px 8px;">${SERVER_NAME}</span></strong>
          لم يتم قبوله هذه المرة.
        </p>

        <div style="background:#fdeaea;border-radius:18px;padding:25px;margin:25px 0;border-right:8px solid #c04848;">
          <h2 style="margin-top:0;color:#8a1f1f;">📄 سبب الرفض</h2>
          <div style="font-size:21px;color:#5c3636;">
            ${reason}
          </div>
        </div>

        <p style="text-align:center;margin-top:30px;font-size:22px;">
          يمكنك التقديم مرة أخرى لاحقًا بعد تحسين الطلب.
        </p>
      </div>

      <div style="border-top:1px solid #cfd8e3;padding:20px;text-align:center;color:#5b7890;font-size:18px;">
        <strong><span style="background:#f3d77a;padding:2px 8px;">${SERVER_NAME}</span></strong>
        — هذا إيميل تلقائي من
        <br>© 2026 ${SERVER_NAME}. جميع الحقوق محفوظة.
      </div>
    </div>
  </div>
  `;
}

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
    const line = `[${date}] ${msg.author.tag}: ${msg.content || '[embed/attachment]'}\n`;
    content += line;
  }

  return Buffer.from(content, 'utf-8');
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
      .setDescription('إرسال لوحة قرارات الإدارة')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
      .setName('dashboard')
      .setDescription('لوحة التحكم')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
  ].map((cmd) => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered');
  } catch (error) {
    console.error('❌ Slash command registration error:', error);
  }
}

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
    {
      key: 'full_name',
      question: '📌 ما الاسم الكامل؟',
      minWords: 2,
      shortError: '❌ تم رفض التقديم: الاسم الكامل قصير جدًا.'
    },
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
        if (Number.isNaN(age)) return '❌ تم رفض التقديم: العمر يجب أن يكون رقمًا.';
        if (age < 18) return '❌ تم رفض التقديم: تحت السن المطلوب (18+).';
        return null;
      }
    },
    {
      key: 'country_city',
      question: '🌍 من أي دولة / مدينة؟',
      minWords: 2,
      shortError: '❌ تم رفض التقديم: الإجابة صغيرة عن الإجابة المطلوبة.'
    },
    {
      key: 'hours',
      question: '⏰ كم ساعة تقدر تتواجد يوميًا؟',
      minWords: 2,
      shortError: '❌ تم رفض التقديم: الإجابة صغيرة عن الإجابة المطلوبة.'
    },
    {
      key: 'experience',
      question: '🧠 ما خبرتك السابقة في الإدارة؟',
      minWords: 4,
      shortError: '❌ تم رفض التقديم: الإجابة صغيرة عن الإجابة المطلوبة.'
    },
    {
      key: 'why_admin',
      question: '📋 لماذا تريد الانضمام للإدارة؟',
      minWords: 4,
      shortError: '❌ تم رفض التقديم: الإجابة صغيرة عن الإجابة المطلوبة.'
    },
    {
      key: 'problem_handling',
      question: '🛠️ كيف تتعامل مع المشاكل أو الخلافات؟',
      minWords: 4,
      shortError: '❌ تم رفض التقديم: الإجابة صغيرة عن الإجابة المطلوبة.'
    },
    {
      key: 'special',
      question: '⭐ ما الذي يميزك عن غيرك؟',
      minWords: 4,
      shortError: '❌ تم رفض التقديم: الإجابة صغيرة عن الإجابة المطلوبة.'
    },
    {
      key: 'server_rules',
      question: '📚 هل قرأت قوانين السيرفر وتفهمها؟ اشرح بشكل مختصر.',
      minWords: 4,
      shortError: '❌ تم رفض التقديم: الإجابة صغيرة عن الإجابة المطلوبة.'
    },
    {
      key: 'activity_days',
      question: '📅 في أي أيام تكون متواجد أكثر؟',
      minWords: 2,
      shortError: '❌ تم رفض التقديم: الإجابة صغيرة عن الإجابة المطلوبة.'
    }
  ];

  const answers = {};

  try {
    await dm.send(
      `📋 **بدأ التقديم على الإدارة**\n\n` +
      `سيتم سؤالك سؤالًا واحدًا في كل مرة.\n` +
      `إذا كان العمر أقل من 18 أو الإيميل غير صحيح أو الإجابات قصيرة جدًا سيتم رفض التقديم تلقائيًا.`
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
        const validationError = q.validate(answer);
        if (validationError) {
          await dm.send(validationError);

          const autoRejectEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('❌ تم رفض تقديم تلقائيًا')
            .setDescription(
              `**المتقدم:** ${user.tag}\n` +
              `**السبب:** ${validationError}`
            )
            .setFooter({ text: BOT_FOOTER });

          await reviewChannel.send({ embeds: [autoRejectEmbed] }).catch(() => {});
          return;
        }
      }

      if (q.minWords && countWords(answer) < q.minWords) {
        await dm.send(q.shortError || '❌ تم رفض التقديم: الإجابة قصيرة جدًا.');

        const autoRejectEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('❌ تم رفض تقديم تلقائيًا')
          .setDescription(
            `**المتقدم:** ${user.tag}\n` +
            `**السبب:** ${q.shortError || 'الإجابة قصيرة جدًا.'}`
          )
          .setFooter({ text: BOT_FOOTER });

        await reviewChannel.send({ embeds: [autoRejectEmbed] }).catch(() => {});
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
      activity_days: answers.activity_days
    });

    const reviewEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 تقديم جديد للإدارة')
      .setDescription(
        `**المتقدم:** ${user.tag}\n` +
        `**User ID:** ${user.id}`
      )
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
  } catch (err) {
    await dm.send('❌ انتهى وقت التقديم أو حدث خطأ أثناء جمع الإجابات.').catch(() => {});
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

  await sendLog('✅ تم تشغيل البوت وإرسال/التحقق من كل اللوحات.');
});

/* =========================
   عضو جديد
========================= */

client.on(Events.GuildMemberAdd, async (member) => {
  const welcomeChannel = await fetchChannel(WELCOME_CHANNEL_ID);

  try {
    await member.roles.add(PLAYER_ROLE_ID);
  } catch (err) {
    console.log('❌ فشل إعطاء رول Player');
  }

  if (!welcomeChannel) return;

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('✨ عضو جديد')
    .setDescription(
      `مرحبًا بك ${member} في **${BOT_NAME}** 🌆\n\n` +
      `تم إعطاؤك رتبة Player 🎮\n` +
      `يرجى قراءة القوانين أولًا ثم استمتع بوقتك معنا 💙`
    )
    .setFooter({ text: BOT_FOOTER });

  await welcomeChannel.send({
    embeds: [embed],
    components: [buildRulesButtonRow(member.guild.id)]
  }).catch(() => {});
});

/* =========================
   InteractionCreate
========================= */

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    /* ===== Slash Commands ===== */
    if (interaction.isChatInputCommand()) {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content: '❌ هذا الأمر للإدارة فقط.',
          ephemeral: true
        });
      }

      if (interaction.commandName === 'setup') {
        await sendWelcomePanel();
        await sendTicketsPanel();
        await sendDecisionPanel();

        return interaction.reply({
          content: '✅ تم إرسال كل اللوحات أو التحقق من وجودها.',
          ephemeral: true
        });
      }

      if (interaction.commandName === 'panel-welcome') {
        await sendWelcomePanel();
        return interaction.reply({
          content: '✅ تم إرسال لوحة الترحيب أو كانت موجودة بالفعل.',
          ephemeral: true
        });
      }

      if (interaction.commandName === 'panel-tickets') {
        await sendTicketsPanel();
        return interaction.reply({
          content: '✅ تم إرسال لوحة التذاكر أو كانت موجودة بالفعل.',
          ephemeral: true
        });
      }

      if (interaction.commandName === 'panel-decisions') {
        await sendDecisionPanel();
        return interaction.reply({
          content: '✅ تم إرسال لوحة القرارات أو كانت موجودة بالفعل.',
          ephemeral: true
        });
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
    if (interaction.isButton() && interaction.customId === 'toggle_tickets') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content: '❌ هذا الزر للإدارة فقط.',
          ephemeral: true
        });
      }

      dataStore.system.tickets = !dataStore.system.tickets;
      saveData(dataStore);

      await sendLog(`⚙️ تم تغيير حالة التذاكر بواسطة ${interaction.user.tag} إلى ${dataStore.system.tickets ? 'ON' : 'OFF'}`);

      return interaction.update({
        embeds: [buildDashboardEmbed()],
        components: buildDashboardButtons()
      });
    }

    if (interaction.isButton() && interaction.customId === 'toggle_apps') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content: '❌ هذا الزر للإدارة فقط.',
          ephemeral: true
        });
      }

      dataStore.system.applications = !dataStore.system.applications;
      saveData(dataStore);

      await sendLog(`⚙️ تم تغيير حالة التقديمات بواسطة ${interaction.user.tag} إلى ${dataStore.system.applications ? 'ON' : 'OFF'}`);

      return interaction.update({
        embeds: [buildDashboardEmbed()],
        components: buildDashboardButtons()
      });
    }

    /* ===== تقديم للإدارة ===== */
    if (interaction.isButton() && interaction.customId === 'apply_admin') {
      if (!dataStore.system.applications) {
        return interaction.reply({
          content: '❌ التقديمات متوقفة حالياً.',
          ephemeral: true
        });
      }

      return startAdminApplication(interaction);
    }

    /* ===== فتح التذاكر ===== */
    if (interaction.isButton() && TICKET_TYPES[interaction.customId]) {
      if (!dataStore.system.tickets) {
        return interaction.reply({
          content: '❌ نظام التذاكر متوقف حالياً.',
          ephemeral: true
        });
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
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
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
          `يرجى كتابة التفاصيل بوضوح وسيتم الرد عليك بأقرب وقت.`
        )
        .addFields(
          { name: 'رقم التذكرة', value: `#${ticketId}`, inline: true },
          { name: 'نوع التذكرة', value: ticketInfo.label, inline: true },
          { name: 'صاحب التذكرة', value: interaction.user.tag, inline: true }
        )
        .setFooter({ text: BOT_FOOTER });

      try {
        await ticketChannel.send({
          content: `${interaction.user} <@&${SUPPORT_ROLE_ID}>`,
          embeds: [ticketEmbed],
          components: buildTicketButtons()
        });
      } catch (err) {
        console.error('❌ Error sending ticket message:', err);

        await ticketChannel.send({
          content: `❌ حصل خطأ في الرسالة الأساسية، لكن التذكرة اتفتحت يا ${interaction.user}`
        }).catch(() => {});
      }

      await sendLog(
        `📂 تم فتح تذكرة جديدة\n` +
        `رقم التذكرة: #${ticketId}\n` +
        `العضو: ${interaction.user.tag}\n` +
        `النوع: ${ticketInfo.label}\n` +
        `القناة: ${ticketChannel}`
      );

      return interaction.editReply({
        content: `✅ تم فتح التذكرة بنجاح: ${ticketChannel}`
      });
    }

    /* ===== استلام التذكرة ===== */
    if (interaction.isButton() && interaction.customId === 'claim_ticket') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: '❌ فقط الإدارة أو الدعم يمكنهم استلام التذكرة.',
          ephemeral: true
        });
      }

      const claimedBy = claimedTickets.get(interaction.channel.id);
      if (claimedBy) {
        return interaction.reply({
          content: `❌ هذه التذكرة مستلمة بالفعل بواسطة <@${claimedBy}>`,
          ephemeral: true
        });
      }

      claimedTickets.set(interaction.channel.id, interaction.user.id);

      await interaction.reply({
        content: `📌 تم استلام التذكرة بواسطة ${interaction.user}`,
        ephemeral: false
      });

      await sendLog(
        `📌 تم استلام تذكرة\n` +
        `القناة: ${interaction.channel.name}\n` +
        `بواسطة: ${interaction.user.tag}`
      );

      return;
    }

    /* ===== Transcript ===== */
    if (interaction.isButton() && interaction.customId === 'transcript_ticket') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: '❌ فقط الإدارة أو الدعم يمكنهم نسخ المحادثة.',
          ephemeral: true
        });
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

      await sendLog(
        `🧾 تم إنشاء Transcript\n` +
        `القناة: ${interaction.channel.name}\n` +
        `بواسطة: ${interaction.user.tag}`
      );

      return;
    }

    /* ===== زر إغلاق التذكرة ===== */
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: '❌ فقط الإدارة أو الدعم يمكنهم إغلاق التذكرة.',
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('close_ticket_modal')
        .setTitle('إغلاق التذكرة');

      const reasonInput = new TextInputBuilder()
        .setCustomId('close_reason')
        .setLabel('اكتب سبب إغلاق التذكرة')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(reasonInput)
      );

      return interaction.showModal(modal);
    }

    /* ===== مودال إغلاق التذكرة ===== */
    if (interaction.isModalSubmit() && interaction.customId === 'close_ticket_modal') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: '❌ هذا الإجراء خاص بالإدارة أو الدعم.',
          ephemeral: true
        });
      }

      const reason = interaction.fields.getTextInputValue('close_reason').trim();
      const parsed = parseTicketTopic(interaction.channel.topic);

      const ownerId = parsed.ownerId;
      const ticketId = parsed.ticketId || 'غير معروف';
      const ticketType = parsed.ticketType || 'غير معروف';

      try {
        const user = await client.users.fetch(ownerId);

        const dmEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('🔒 تم إغلاق تذكرتك')
          .setDescription(
            `تم إغلاق تذكرتك في سيرفر **${BOT_NAME}**\n\n` +
            `🎫 رقم التذكرة: **#${ticketId}**\n` +
            `📂 نوع التذكرة: **${ticketType}**\n\n` +
            `📄 السبب:\n${reason}`
          )
          .setFooter({ text: BOT_FOOTER });

        await user.send({ embeds: [dmEmbed] });

        await user.send({
          content: `⭐ قيّم تجربتك مع التذكرة #${ticketId}`,
          components: buildRatingRow(ticketId)
        });
      } catch (err) {
        console.log('❌ Failed to send close reason DM');
      }

      await sendLog(
        `🔒 تم إغلاق تذكرة\n` +
        `رقم التذكرة: #${ticketId}\n` +
        `القناة: ${interaction.channel.name}\n` +
        `بواسطة: ${interaction.user.tag}\n` +
        `السبب: ${reason}`
      );

      await interaction.reply({
        content: '🔒 سيتم حذف التذكرة خلال 5 ثوانٍ...'
      });

      setTimeout(async () => {
        claimedTickets.delete(interaction.channel.id);
        await interaction.channel.delete().catch(() => {});
      }, 5000);

      return;
    }

    /* ===== أزرار التقييم ===== */
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

    /* ===== مودال التقييم ===== */
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
            { name: '👤 العضو', value: interaction.user.tag }
          )
          .setFooter({ text: BOT_FOOTER });

        await reviewChannel.send({ embeds: [reviewEmbed] }).catch(() => {});
      }

      return interaction.reply({
        content: '✅ شكراً لتقييمك.',
        ephemeral: true
      });
    }

    /* ===== فتح مودال قرارات الإدارة ===== */
    if (interaction.isButton() && interaction.customId === 'open_decision_modal') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content: '❌ هذا الزر خاص بالإدارة فقط.',
          ephemeral: true
        });
      }

      if (interaction.channel.id !== DECISION_CHANNEL_ID) {
        return interaction.reply({
          content: '❌ استخدم هذا الزر داخل قناة قرارات الإدارة فقط.',
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('decision_modal')
        .setTitle('إرسال قرار إداري');

      const messageInput = new TextInputBuilder()
        .setCustomId('decision_message')
        .setLabel('اكتب الرسالة التي ستصل لكل الأعضاء')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(messageInput)
      );

      return interaction.showModal(modal);
    }

    /* ===== إرسال قرار للجميع ===== */
    if (interaction.isModalSubmit() && interaction.customId === 'decision_modal') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content: '❌ هذا الإجراء خاص بالإدارة فقط.',
          ephemeral: true
        });
      }

      const messageValue = interaction.fields.getTextInputValue('decision_message').trim();

      await interaction.reply({
        content: '📢 جاري إرسال الرسالة إلى جميع الأعضاء...',
        ephemeral: true
      });

      let success = 0;
      let failed = 0;

      const members = await interaction.guild.members.fetch();

      for (const [, member] of members) {
        if (member.user.bot) continue;

        try {
          const dmEmbed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle(`📢 رسالة من إدارة ${BOT_NAME}`)
            .setDescription(
              `👋 أهلاً يا **${member.user.username}**\n\n` +
              `${messageValue}\n\n` +
              `━━━━━━━━━━━━━━━\n` +
              `💬 تم إرسال هذه الرسالة لك من إدارة السيرفر.`
            )
            .setFooter({ text: BOT_FOOTER });

          await member.send({ embeds: [dmEmbed] });
          success++;
        } catch (error) {
          failed++;
        }
      }

      await sendLog(
        `📨 تم إرسال برودكاست إداري\n` +
        `بواسطة: ${interaction.user.tag}\n` +
        `نجح: ${success}\n` +
        `فشل: ${failed}\n` +
        `الرسالة: ${messageValue}`
      );

      return interaction.followUp({
        content: `✅ تم إرسال الرسالة للجميع.\nنجح: ${success}\nفشل: ${failed}`,
        ephemeral: true
      });
    }

    /* ===== تحديد موعد أو تجديد موعد ===== */
    if (
      interaction.isButton() &&
      (
        interaction.customId.startsWith('set_appointment_') ||
        interaction.customId.startsWith('renew_appointment_')
      )
    ) {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: '❌ هذا الزر للإدارة فقط.',
          ephemeral: true
        });
      }

      const applicantId = interaction.customId
        .replace('set_appointment_', '')
        .replace('renew_appointment_', '');

      const isRenew = interaction.customId.startsWith('renew_appointment_');

      const modal = new ModalBuilder()
        .setCustomId(`${isRenew ? 'renew' : 'set'}_appointment_modal_${applicantId}`)
        .setTitle(isRenew ? 'تجديد موعد المقابلة الصوتية' : 'تحديد موعد المقابلة الصوتية');

      const appointmentInput = new TextInputBuilder()
        .setCustomId('appointment_value')
        .setLabel('اكتب الموعد')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(appointmentInput)
      );

      return interaction.showModal(modal);
    }

    /* ===== مودال حفظ / تجديد الموعد ===== */
    if (
      interaction.isModalSubmit() &&
      (
        interaction.customId.startsWith('set_appointment_modal_') ||
        interaction.customId.startsWith('renew_appointment_modal_')
      )
    ) {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: '❌ هذا الإجراء للإدارة فقط.',
          ephemeral: true
        });
      }

      const applicantId = interaction.customId
        .replace('set_appointment_modal_', '')
        .replace('renew_appointment_modal_', '');

      const appointmentValue = interaction.fields.getTextInputValue('appointment_value').trim();
      const oldData = getApplicationData(applicantId) || {};

      setApplicationData(applicantId, {
        appointment: appointmentValue
      });

      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]);

      const filteredFields = (updatedEmbed.data.fields || []).filter(
        (field) => field.name !== 'موعد المقابلة الصوتية'
      );

      updatedEmbed.setFields([
        ...filteredFields,
        { name: 'موعد المقابلة الصوتية', value: appointmentValue || 'غير موجود' }
      ]);

      await interaction.update({
        embeds: [updatedEmbed],
        components: buildApplicationActionRow(applicantId)
      });

      if (oldData?.email) {
        try {
          await sendEmail(
            oldData.email,
            'تحديد / تجديد موعد المقابلة الصوتية',
            buildAcceptEmailHtml(oldData.username || 'Member', appointmentValue)
          );
        } catch (err) {
          console.log('❌ Failed to send appointment email');
        }
      }

      const user = await client.users.fetch(applicantId).catch(() => null);
      if (user) {
        await user.send(
          `📅 **تم ${interaction.customId.startsWith('renew_') ? 'تجديد' : 'تحديد'} موعد المقابلة الصوتية**\n\n` +
          `${appointmentValue}`
        ).catch(() => {});
      }

      await sendLog(
        `📅 تم ${interaction.customId.startsWith('renew_') ? 'تجديد' : 'تحديد'} موعد مقابلة\n` +
        `للمتقدم: ${applicantId}\n` +
        `بواسطة: ${interaction.user.tag}\n` +
        `الموعد: ${appointmentValue}`
      );

      return;
    }

    /* ===== قبول التقديم ===== */
    if (interaction.isButton() && interaction.customId.startsWith('accept_application_')) {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: '❌ هذا الزر للإدارة فقط.',
          ephemeral: true
        });
      }

      const applicantId = interaction.customId.replace('accept_application_', '');
      const member = await interaction.guild.members.fetch(applicantId).catch(() => null);

      if (!member) {
        return interaction.reply({
          content: '❌ لم أجد العضو داخل السيرفر.',
          ephemeral: true
        });
      }

      const appData = getApplicationData(applicantId) || {};

      for (const roleId of APPROVED_ADMIN_ROLE_IDS) {
        await member.roles.add(roleId).catch(() => {});
      }

      await member.send(
        `✅ **تم قبولك في الإدارة**\n\n` +
        `مبروك، تم قبول طلبك في سيرفر **${BOT_NAME}**.\n\n` +
        `📅 موعد المقابلة الصوتية:\n${appData.appointment || 'سيتم تحديده قريبًا.'}`
      ).catch(() => {});

      if (appData.email && isValidEmail(appData.email)) {
        await sendEmail(
          appData.email,
          'تم قبولك في Night City Community',
          buildAcceptEmailHtml(member.user.username, appData.appointment || 'سيتم تحديد الموعد قريبًا.')
        );
      }

      const acceptedEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('✅ تم قبول التقديم')
        .setDescription(
          `\`\`\`diff
+ تم قبول هذا المتقدم بنجاح
\`\`\`\n` +
          `👤 **المتقدم:** <@${applicantId}>\n` +
          `📅 **موعد المقابلة الصوتية:** ${appData.appointment || 'غير محدد'}\n` +
          `🛡️ **تم بواسطة:** ${interaction.user.tag}`
        )
        .setFooter({ text: BOT_FOOTER });

      await interaction.update({
        embeds: [acceptedEmbed],
        components: buildFinalApplicationActionRow(true)
      });

      await sendLog(`✅ تم قبول تقديم ${member.user.tag} بواسطة ${interaction.user.tag}`);
      return;
    }

    /* ===== رفض التقديم ===== */
    if (interaction.isButton() && interaction.customId.startsWith('reject_application_')) {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: '❌ هذا الزر للإدارة فقط.',
          ephemeral: true
        });
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

      modal.addComponents(
        new ActionRowBuilder().addComponents(reasonInput)
      );

      return interaction.showModal(modal);
    }

    /* ===== مودال سبب رفض التقديم ===== */
    if (interaction.isModalSubmit() && interaction.customId.startsWith('reject_application_reason_')) {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: '❌ هذا الإجراء للإدارة فقط.',
          ephemeral: true
        });
      }

      const applicantId = interaction.customId.replace('reject_application_reason_', '');
      const reason = interaction.fields.getTextInputValue('reject_reason').trim();
      const appData = getApplicationData(applicantId) || {};

      const user = await client.users.fetch(applicantId).catch(() => null);
      if (user) {
        await user.send(
          `❌ **تم رفض طلبك للإدارة**\n\n` +
          `السبب:\n${reason}`
        ).catch(() => {});
      }

      if (appData.email && isValidEmail(appData.email)) {
        await sendEmail(
          appData.email,
          'تم رفض طلبك في Night City Community',
          buildRejectEmailHtml(appData.username || 'Member', reason)
        );
      }

      const rejectedEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('❌ تم رفض التقديم')
        .setDescription(
          `\`\`\`diff
- تم رفض هذا المتقدم
\`\`\`\n` +
          `👤 **المتقدم:** <@${applicantId}>\n` +
          `📄 **السبب:** ${reason}\n` +
          `🛡️ **تم بواسطة:** ${interaction.user.tag}`
        )
        .setFooter({ text: BOT_FOOTER });

      await interaction.update({
        embeds: [rejectedEmbed],
        components: buildFinalApplicationActionRow(false)
      });

      await sendLog(`❌ تم رفض تقديم ${applicantId} بواسطة ${interaction.user.tag}\nالسبب: ${reason}`);
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
