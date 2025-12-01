
const { EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

// Armazena tickets ativos (em produção, use banco de dados)
const activeTickets = new Map();

async function handleButton(interaction) {
    const { customId, user, guild, member } = interaction;

    // Handler para botões de criar ticket
    if (customId === 'ticket_comprar' || customId === 'ticket_suporte') {
        await handleTicketCreation(interaction, customId);
    }

    // Handler para botão de fechar ticket
    if (customId === 'fechar_ticket') {
        await handleTicketClose(interaction);
    }
}

async function handleTicketCreation(interaction, type) {
    const { user, guild, member } = interaction;

    // Verifica se o usuário já tem um ticket aberto
    if (activeTickets.has(user.id)) {
        return interaction.reply({
            content: '❌ Você já possui um ticket aberto! Por favor, finalize-o antes de abrir outro.',
            ephemeral: true
        });
    }

    // Verifica se as configurações essenciais existem
    if (!config.staffRoleId) {
        return interaction.reply({
            content: '❌ **Erro de Configuração:** A variável `staffRoleId` não foi definida no arquivo `config.json`. O bot não sabe qual cargo deve atender aos tickets.',
            ephemeral: true
        });
    }

    // Busca o cargo da equipe para garantir que ele existe e está em cache
    let staffRole;
    try {
        staffRole = await guild.roles.fetch(config.staffRoleId);
    } catch (e) {
        console.error(`Erro ao buscar o cargo de staff com ID: ${config.staffRoleId}`, e);
        return interaction.reply({
            content: '❌ **Erro de Configuração:** O `staffRoleId` definido em `config.json` é inválido ou não pôde ser encontrado neste servidor.',
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        // Definir tipo de ticket
        const isCompra = type === 'ticket_comprar';
        const ticketType = isCompra ? 'compra' : 'suporte';
        const ticketEmoji = isCompra ? '🛒' : '📩';

        // Criar canal de ticket
        const ticketChannel = await guild.channels.create({
            name: `ticket-${user.username}`,
            type: ChannelType.GuildText,
            parent: config.categoryId || null,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                },
                {
                    id: staffRole.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageMessages
                    ]
                },
                {
                    id: interaction.client.user.id, // Correção: Usar o ID do bot
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageChannels
                    ]
                }
            ]
        });

        // Armazenar ticket ativo
        activeTickets.set(user.id, {
            channelId: ticketChannel.id,
            type: ticketType,
            createdAt: Date.now()
        });

        // Criar embed de boas-vindas
        let description;
        if (isCompra) {
            description = 
                '**Olá!** 👋 Obrigado pelo interesse em comprar conosco.\n\n' +
                'O que você gostaria de adquirir hoje? Envie o nome do produto ou serviço.\n\n' +
                '📌 **Se você veio do site:** Copie e cole aqui lá — ele contém seu pedido automaticamente.\n\n' +
                'Assim podemos confirmar, separar e entregar o mais rápido possível.\n\n' +
                '✨ Agradecemos a preferência!';
        } else {
            description = 
                '**Olá!** 👋 Bem-vindo(a) ao atendimento de suporte.\n\n' +
                'Por favor, explique com detalhes o que você precisa ou qual problema está enfrentando. Nossa equipe responderá o mais rápido possível.\n\n' +
                `💙 Obrigado por utilizar o **${interaction.client.user.username}**!`;
        }

        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`${ticketEmoji} Ticket de ${isCompra ? 'Compra' : 'Suporte'}`)
            .setDescription(description)
            .setColor(isCompra ? config.colors.success : config.colors.primary)
            .addFields(
                { name: '👤 Usuário', value: `${user}`, inline: true },
                { name: '🆔 ID', value: `${user.id}`, inline: true },
                { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        // Botão para fechar ticket
        const closeButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('fechar_ticket')
                    .setLabel('Fechar Ticket')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger)
            );

        // Enviar mensagem no ticket
        await ticketChannel.send({
            content: `${user} | <@&${config.staffRoleId}>`,
            embeds: [welcomeEmbed],
            components: [closeButton]
        });

        // Confirmar criação
        await interaction.editReply({
            content: `✅ Ticket criado com sucesso! ${ticketChannel}`,
            ephemeral: true
        });

        // Log
        logTicketAction(interaction.client, 'create', user, ticketChannel, ticketType);

    } catch (error) {
        console.error('Erro ao criar ticket:', error);
        await interaction.editReply({
            content: `❌ Ocorreu um erro ao criar o ticket. **Motivo:** \`${error.message}\`. Verifique se o bot tem permissão para gerenciar canais e se o \`categoryId\` em \`config.json\` é válido.`,
            ephemeral: true
        });
    }
}

async function handleTicketClose(interaction) {
    const { channel, user, guild } = interaction;

    // Verificar se é um canal de ticket
    if (!channel.name.startsWith('ticket-')) {
        return interaction.reply({
            content: '❌ Este comando só pode ser usado em canais de ticket!',
            ephemeral: true
        });
    }

    await interaction.deferReply();

    try {
        // Criar embed de fechamento
        const closeEmbed = new EmbedBuilder()
            .setTitle('🔒 Ticket Fechado')
            .setDescription('Este ticket será excluído em 5 segundos...')
            .setColor(config.colors.danger)
            .addFields(
                { name: '👤 Fechado por', value: `${user}`, inline: true },
                { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [closeEmbed] });

        // Remover do mapa de tickets ativos
        for (const [userId, ticketData] of activeTickets.entries()) {
            if (ticketData.channelId === channel.id) {
                activeTickets.delete(userId);
                break;
            }
        }

        // Log
        logTicketAction(interaction.client, 'close', user, channel);

        // Deletar canal após 5 segundos
        setTimeout(async () => {
            await channel.delete('Ticket fechado');
        }, 5000);

    } catch (error) {
        console.error('Erro ao fechar ticket:', error);
        await interaction.editReply({
            content: '❌ Ocorreu um erro ao fechar o ticket.',
            ephemeral: true
        });
    }
}

async function logTicketAction(client, action, user, channel, ticketType = null) {
    if (!config.logChannelId) return;

    try {
        const logChannel = await client.channels.fetch(config.logChannelId);
        if (!logChannel) return;

        const colors = {
            create: config.colors.success,
            close: config.colors.danger
        };

        const titles = {
            create: '📝 Ticket Criado',
            close: '🔒 Ticket Fechado'
        };

        const logEmbed = new EmbedBuilder()
            .setTitle(titles[action])
            .setColor(colors[action])
            .addFields(
                { name: '👤 Usuário', value: `${user} (${user.tag})`, inline: true },
                { name: '🆔 ID do Usuário', value: user.id, inline: true },
                { name: '📺 Canal', value: `${channel}`, inline: true }
            )
            .setTimestamp();

        if (ticketType) {
            logEmbed.addFields({ name: '🎫 Tipo', value: ticketType.toUpperCase(), inline: true });
        }

        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('Erro ao enviar log:', error);
    }
}

module.exports = { handleButton };
