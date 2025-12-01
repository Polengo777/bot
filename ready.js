
const { Events, REST, Routes } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`✅ Bot conectado como ${client.user.tag}`);
        console.log(`📊 Servidores: ${client.guilds.cache.size}`);
        console.log(`👥 Usuários: ${client.users.cache.size}`);

        // Registrar comandos slash
        const commands = [];
        client.commands.forEach(command => {
            commands.push(command.data.toJSON());
        });

        const rest = new REST({ version: '10' }).setToken(client.token);

        try {
            console.log('🔄 Registrando comandos slash...');
            
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands }
            );

            console.log('✅ Comandos slash registrados com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao registrar comandos:', error);
        }

        // Definir status
        client.user.setPresence({
            activities: [{ name: 'tickets | /painel' }],
            status: 'online'
        });
    }
};
