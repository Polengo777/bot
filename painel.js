
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Envia o painel de tickets no canal atual'),
    
    async execute(interaction) {
        // Verifica se o usuário tem permissão de administrador
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: '❌ Você não tem permissão para usar este comando!', 
                ephemeral: true 
            });
        }

        // Criar embed do painel
        const embed = new EmbedBuilder()
            .setTitle('🎫 Ajuda & Compras')
            .setDescription(
                '**Central de Suporte e Compras**\n\n' +
                'Toque no botão abaixo para continuar.\n\n' +
                '━━━━━━━━━━━━━━━━━━━━\n' +
                '*Powered by Ticket King* ✨'
            )
            .setColor('#5865F2')
            .setTimestamp()
            .setFooter({ text: 'Ticket King • Sistema de Atendimento' });

        // Criar botões
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_comprar')
                    .setLabel('Comprar')
                    .setEmoji('🛒')
                    .setStyle(ButtonStyle.Success),
                
                new ButtonBuilder()
                    .setCustomId('ticket_suporte')
                    .setLabel('Suporte')
                    .setEmoji('📩')
                    .setStyle(ButtonStyle.Danger)
            );

        // Enviar painel
        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });

        // Confirmar ao usuário
        await interaction.reply({ 
            content: '✅ Painel de tickets enviado com sucesso!', 
            ephemeral: true 
        });
    }
};
