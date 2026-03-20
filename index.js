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
   Data file
========================= */

const DATA_FILE = path.join(__dirname, 'bot-data.json');

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { ticketCounter: 1 };
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { ticketCounter: 1 };
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
        .setStyle(ButtonStyle.Danger)
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
      `إذا كان العمر أقل من 18 أو الإجابات قصيرة جدًا سيتم رفض التقديم تلقائيًا.`
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

    const reviewEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 تقديم جديد للإدارة')
      .setDescription(
        `**المتقدم:** ${user.tag}\n` +
        `**User ID:** ${user.id}`
      )
      .addFields(
        { name: 'الاسم الكامل', value: answers.full_name || 'غير موجود' },
        { name: 'العمر', value: answers.age || 'غير موجود' },
        { name: 'الدولة / المدينة', value: answers.country_city || 'غير موجود' },
        { name: 'ساعات التواجد', value: answers.hours || 'غير موجود' },
        { name: 'الخبرة السابقة', value: answers.experience || 'غير موجود' },
        { name: 'لماذا يريد الإدارة', value: answers.why_admin || 'غير موجود' },
        { name: 'كيف يتعامل مع المشاكل', value: answers.problem_handling || 'غير موجود' },
        { name: 'ما الذي يميزه', value: answers.special || 'غير موجود' },
        { name: 'فهم القوانين', value: answers.server_rules || 'غير موجود' },
        { name: 'أيام النشاط', value: answers.activity_days || 'غير موجود' }
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
    }

    /* ===== تقديم للإدارة ===== */
    if (interaction.isButton() && interaction.customId === 'apply_admin') {
      return startAdminApplication(interaction);
    }

    /* ===== فتح التذاكر ===== */
    if (interaction.isButton() && TICKET_TYPES[interaction.customId]) {
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
            { name: 'السبب', value: reason }
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

      for (const roleId of APPROVED_ADMIN_ROLE_IDS) {
        await member.roles.add(roleId).catch(() => {});
      }

      await member.send(
        `✅ **تم قبولك في الإدارة**\n\n` +
        `مبروك، تم قبول طلبك في سيرفر **${BOT_NAME}**.`
      ).catch(() => {});

      const acceptedEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('✅ تم قبول التقديم')
        .setDescription(
          `\`\`\`diff
+ تم قبول هذا المتقدم بنجاح
\`\`\`\n` +
          `👤 **المتقدم:** <@${applicantId}>\n` +
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

      const user = await client.users.fetch(applicantId).catch(() => null);
      if (user) {
        await user.send(
          `❌ **تم رفض طلبك للإدارة**\n\n` +
          `السبب:\n${reason}`
        ).catch(() => {});
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
