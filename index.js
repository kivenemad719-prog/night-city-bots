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
  TextInputStyle
} = require('discord.js');

require('dotenv').config();

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
   إعدادات التذاكر
========================= */
const TICKET_TYPES = {
  ticket_support: {
    label: 'دعم فني',
    emoji: '🎫',
    categoryId: process.env.CATEGORY_SUPPORT_ID,
    prefix: 'support',
    color: 0x5865F2
  },
  ticket_report: {
    label: 'إبلاغ على عضو',
    emoji: '🚨',
    categoryId: process.env.CATEGORY_REPORTS_ID,
    prefix: 'report',
    color: 0xED4245
  },
  ticket_question: {
    label: 'استفسار',
    emoji: '❓',
    categoryId: process.env.CATEGORY_QUESTIONS_ID,
    prefix: 'question',
    color: 0xFEE75C
  },
  ticket_suggestion: {
    label: 'اقتراح',
    emoji: '💡',
    categoryId: process.env.CATEGORY_SUGGESTIONS_ID,
    prefix: 'suggestion',
    color: 0x57F287
  },
  ticket_partnership: {
    label: 'شراكة',
    emoji: '🤝',
    categoryId: process.env.CATEGORY_PARTNERSHIP_ID,
    prefix: 'partner',
    color: 0xEB459E
  }
};

/* =========================
   مساعدات
========================= */
function sanitizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '')
    .slice(0, 10) || 'user';
}

async function fetchChannel(id) {
  try {
    return await client.channels.fetch(id);
  } catch {
    return null;
  }
}

async function sendLog(content) {
  const logChannel = await fetchChannel(process.env.LOG_CHANNEL_ID);
  if (!logChannel) return;
  await logChannel.send({ content }).catch(() => {});
}

function hasAdmin(member) {
  return member.roles.cache.has(process.env.ADMIN_ROLE_ID);
}

function hasSupport(member) {
  return member.roles.cache.has(process.env.SUPPORT_ROLE_ID);
}

async function panelAlreadyExists(channel, titleText) {
  try {
    const messages = await channel.messages.fetch({ limit: 20 });
    return messages.some((msg) =>
      msg.author.id === client.user.id &&
      msg.embeds.length > 0 &&
      msg.embeds[0].title === titleText
    );
  } catch {
    return false;
  }
}

/* =========================
   عند التشغيل
========================= */
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const welcomeChannel = await fetchChannel(process.env.WELCOME_CHANNEL_ID);
  const ticketsPanelChannel = await fetchChannel(process.env.TICKETS_PANEL_CHANNEL_ID);
  const decisionChannel = await fetchChannel(process.env.DECISION_CHANNEL_ID);

  /* ===== بانل الترحيب ===== */
  if (welcomeChannel) {
    const exists = await panelAlreadyExists(welcomeChannel, '👋 مرحبًا بك في Night City Community');

    if (!exists) {
      const rulesRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('📜 الدخول إلى القوانين')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${process.env.GUILD_ID}/${process.env.RULES_CHANNEL_ID}`)
      );

      const welcomeEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('👋 مرحبًا بك في Night City Community')
        .setDescription(
          `مرحبًا بك في سيرفر **Night City Community** 🌆\n\n` +
          `نرحب بك في مجتمعنا ونتمنى لك وقتًا ممتعًا معنا.\n` +
          `فضلاً اقرأ القوانين أولًا قبل المشاركة داخل السيرفر.`
        )
        .setFooter({ text: 'Night City Community' });

      await welcomeChannel.send({
        embeds: [welcomeEmbed],
        components: [rulesRow]
      }).catch(() => {});
    }
  }

  /* ===== بانل التذاكر ===== */
  if (ticketsPanelChannel) {
    const exists = await panelAlreadyExists(ticketsPanelChannel, '🎫 نظام التذاكر');

    if (!exists) {
      const ticketEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🎫 نظام التذاكر')
        .setDescription(
          `اختر نوع التذكرة المناسب من الأزرار بالأسفل.\n\n` +
          `كل نوع تذكرة يفتح في **كاتيجوري مختلفة** تلقائيًا.\n` +
          `يرجى اختيار القسم الصحيح لتسهيل الرد عليك بسرعة.`
        )
        .setFooter({ text: 'Night City Community Tickets' });

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

      await ticketsPanelChannel.send({
        embeds: [ticketEmbed],
        components: [row1, row2]
      }).catch(() => {});
    }
  }

  /* ===== بانل قرارات الإدارة ===== */
  if (decisionChannel) {
    const exists = await panelAlreadyExists(decisionChannel, '📢 قرارات الإدارة');

    if (!exists) {
      const decisionEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('📢 قرارات الإدارة')
        .setDescription(
          `هذا القسم مخصص للإدارة لإرسال الرسائل إلى جميع أعضاء السيرفر.\n\n` +
          `عند الضغط على الزر، ستكتب الرسالة مرة واحدة،` +
          ` ثم يقوم البوت بإرسالها **لكل الأعضاء** في الخاص،` +
          ` مع كتابة اسم كل عضو داخل رسالته تلقائيًا.`
        )
        .setFooter({ text: 'Night City Community Administration' });

      const decisionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('open_decision_modal')
          .setLabel('📝 كتابة قرار / إرسال رسالة')
          .setStyle(ButtonStyle.Primary)
      );

      await decisionChannel.send({
        embeds: [decisionEmbed],
        components: [decisionRow]
      }).catch(() => {});
    }
  }

  await sendLog('✅ تم تشغيل البوت والتأكد من البانلات الرئيسية.');
});

/* =========================
   رسالة ترحيب للأعضاء الجدد
========================= */
client.on(Events.GuildMemberAdd, async (member) => {
  const welcomeChannel = await fetchChannel(process.env.WELCOME_CHANNEL_ID);
  if (!welcomeChannel) return;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('📜 قراءة القوانين')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/channels/${member.guild.id}/${process.env.RULES_CHANNEL_ID}`)
  );

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('✨ عضو جديد')
    .setDescription(
      `مرحبًا بك ${member} في **Night City Community** 🌆\n\n` +
      `يسعدنا انضمامك إلينا.\n` +
      `يرجى قراءة القوانين أولًا ثم استمتع بوقتك معنا 💙`
    )
    .setFooter({ text: 'Welcome to Night City Community' });

  await welcomeChannel.send({
    embeds: [embed],
    components: [row]
  }).catch(() => {});
});

/* =========================
   التفاعلات
========================= */
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    /* ===== فتح تذكرة ===== */
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
            id: process.env.ADMIN_ROLE_ID,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageChannels
            ]
          },
          {
            id: process.env.SUPPORT_ROLE_ID,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          }
        ]
      });

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('إغلاق التذكرة')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

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
        .setFooter({ text: 'Night City Community Ticket System' });

      await ticketChannel.send({
        content: `${interaction.user} <@&${process.env.SUPPORT_ROLE_ID}>`,
        embeds: [ticketEmbed],
        components: [closeRow]
      });

      await sendLog(
        `📂 تم فتح تذكرة جديدة\n` +
        `العضو: ${interaction.user.tag}\n` +
        `النوع: ${ticketInfo.label}\n` +
        `القناة: ${ticketChannel}`
      );

      return interaction.reply({
        content: `✅ تم فتح التذكرة بنجاح: ${ticketChannel}`,
        ephemeral: true
      });
    }

    /* ===== إغلاق التذكرة ===== */
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      if (!hasAdmin(interaction.member) && !hasSupport(interaction.member)) {
        return interaction.reply({
          content: '❌ فقط الإدارة أو الدعم يمكنهم إغلاق التذكرة.',
          ephemeral: true
        });
      }

      await sendLog(
        `🔒 تم إغلاق تذكرة\n` +
        `القناة: ${interaction.channel.name}\n` +
        `بواسطة: ${interaction.user.tag}`
      );

      await interaction.reply({
        content: '🔒 سيتم حذف التذكرة خلال 5 ثوانٍ...'
      });

      setTimeout(async () => {
        await interaction.channel.delete().catch(() => {});
      }, 5000);

      return;
    }

    /* ===== فتح مودال قرارات الإدارة ===== */
    if (interaction.isButton() && interaction.customId === 'open_decision_modal') {
      if (!hasAdmin(interaction.member)) {
        return interaction.reply({
          content: '❌ هذا الزر خاص بالإدارة فقط.',
          ephemeral: true
        });
      }

      if (interaction.channel.id !== process.env.DECISION_CHANNEL_ID) {
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

    /* ===== إرسال الرسالة لكل الأعضاء ===== */
    if (interaction.isModalSubmit() && interaction.customId === 'decision_modal') {
      if (!hasAdmin(interaction.member)) {
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
            .setTitle('📢 رسالة من إدارة Night City Community')
            .setDescription(
              `👋 أهلاً يا **${member.user.username}**\n\n` +
              `${messageValue}\n\n` +
              `━━━━━━━━━━━━━━━\n` +
              `💬 تم إرسال هذه الرسالة لك من إدارة السيرفر.`
            )
            .setFooter({ text: 'Night City Community Administration' });

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
    }
  }
});

client.login(process.env.TOKEN);