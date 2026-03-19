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

/* =========================
   IDs - حطهم هنا
========================= */

const GUILD_ID = '1482955089391124583';

const ADMIN_ROLE_ID = '1484040156318138390';
const SUPPORT_ROLE_ID = '1484040249788207175';

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
   إعدادات البوت
========================= */

const CLIENT_ID = '1484035052198428843'; // ايدي البوت نفسه

const BOT_NAME = 'Night City Community';
const BOT_FOOTER = 'Night City Community System';

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
   تخزين مؤقت بسيط
========================= */

const claimedTickets = new Map();

/* =========================
   Helpers
========================= */

function sanitizeName(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '')
      .slice(0, 12) || 'user'
  );
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
      `يرجى اختيار القسم الصحيح لتسهيل الرد عليك بسرعة.`
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

  return [row1, row2];
}

function buildDecisionPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle('📢 قرارات الإدارة')
    .setDescription(
      `هذا القسم مخصص للإدارة لإرسال الرسائل إلى جميع أعضاء السيرفر.\n\n` +
      `عند الضغط على الزر، ستكتب الرسالة مرة واحدة،` +
      ` ثم يقوم البوت بإرسالها **لكل الأعضاء** في الخاص،` +
      ` مع كتابة اسم كل عضو داخل رسالته تلقائيًا.`
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
  return {
    ownerId: ownerMatch ? ownerMatch[1] : null,
    ticketType: typeMatch ? typeMatch[1] : null
  };
}

async function createTranscript(channel) {
  const fetched = await channel.messages.fetch({ limit: 100 });
  const messages = [...fetched.values()].reverse();

  let content = `Transcript for #${channel.name}\n\n`;

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
  if (!welcomeChannel) return;

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('✨ عضو جديد')
    .setDescription(
      `مرحبًا بك ${member} في **${BOT_NAME}** 🌆\n\n` +
      `يسعدنا انضمامك إلينا.\n` +
      `يرجى قراءة القوانين أولًا ثم استمتع بوقتك معنا 💙`
    )
    .setFooter({ text: BOT_FOOTER });

  await welcomeChannel.send({
    embeds: [embed],
    components: [buildRulesButtonRow(member.guild.id)]
  }).catch(() => {});
});

/* =========================
   Slash Commands
========================= */

client.on(Events.InteractionCreate, async (interaction) => {
  try {
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

    /* =========================
       أزرار التذاكر
    ========================= */

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

      const channelName = `${ticketInfo.prefix}-${sanitizeName(interaction.user.username)}`;

      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: ticketInfo.categoryId,
        topic: `OWNER:${interaction.user.id} | TYPE:${interaction.customId}`,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
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
        .setTitle(`${ticketInfo.emoji} ${ticketInfo.label}`)
        .setDescription(
          `مرحبًا ${interaction.user}\n\n` +
          `تم فتح تذكرتك بنجاح.\n` +
          `يرجى كتابة التفاصيل بوضوح وسيتم الرد عليك بأقرب وقت.`
        )
        .addFields(
          { name: 'نوع التذكرة', value: ticketInfo.label, inline: true },
          { name: 'صاحب التذكرة', value: interaction.user.tag, inline: true }
        )
        .setFooter({ text: BOT_FOOTER });

      await ticketChannel.send({
        content: `${interaction.user} <@&${SUPPORT_ROLE_ID}>`,
        embeds: [ticketEmbed],
        components: buildTicketButtons()
      });

      await sendLog(
        `📂 تم فتح تذكرة جديدة\n` +
        `العضو: ${interaction.user.tag}\n` +
        `النوع: ${ticketInfo.label}\n` +
        `القناة: ${ticketChannel}`
      );

      return interaction.editReply({
        content: `✅ تم فتح التذكرة بنجاح: ${ticketChannel}`
      });
    }

    /* =========================
       استلام التذكرة
    ========================= */

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

    /* =========================
       Transcript
    ========================= */

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

    /* =========================
       إغلاق التذكرة
    ========================= */

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: '❌ فقط الإدارة أو الدعم يمكنهم إغلاق التذكرة.',
          ephemeral: true
        });
      }

      const parsed = parseTicketTopic(interaction.channel.topic);
      const ownerMention = parsed.ownerId ? `<@${parsed.ownerId}>` : 'غير معروف';

      await sendLog(
        `🔒 تم إغلاق تذكرة\n` +
        `القناة: ${interaction.channel.name}\n` +
        `المالك: ${ownerMention}\n` +
        `بواسطة: ${interaction.user.tag}`
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

    /* =========================
       قرارات الإدارة
    ========================= */

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

    /* =========================
       إرسال قرار للجميع
    ========================= */

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
