const { Client, GatewayIntentBits, Collection, Events, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const buttonHandlers = require('./handlers/buttonHandler');

// Carregar configurações
const config = require('./config.json');

// Configuração do cliente
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Coleção de comandos
client.commands = new Collection();

// Carregar comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// Carregar eventos
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Evento 'ready' para verificar a configuração quando o bot fica online
client.once(Events.ClientReady, async readyClient => {
    console.log(`✅ Logado como ${readyClient.user.tag}`);

    // Validação da configuração
    const guild = readyClient.guilds.cache.first(); // Pega o primeiro servidor em que o bot está
    if (!guild) {
        console.error("❌ Erro Crítico: O bot não está em nenhum servidor.");
        return;
    }

    console.log(`🔍 Verificando configurações para o servidor: ${guild.name}`);

    const staffRole = await guild.roles.fetch(config.staffRoleId).catch(() => null);
    if (!staffRole) {
        console.error(`❌ Erro de Configuração: O 'staffRoleId' (${config.staffRoleId}) é inválido ou o cargo não foi encontrado no servidor '${guild.name}'.`);
    } else {
        console.log(`✔️ Cargo de staff ('${staffRole.name}') encontrado com sucesso.`);
    }
});

// Handler de interações
client.on(Events.InteractionCreate, async interaction => {
    // Handler de botões
    if (interaction.isButton()) {
        await buttonHandlers.handleButton(interaction);
        return; // Impede que a interação continue sendo processada
    }

    // Handler de comandos slash
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        // Se o comando não for encontrado, informa ao usuário.
        if (!command) return interaction.reply({ content: 'Comando não encontrado.', ephemeral: true });

        const adminRoleId = config.staffRoleId; // Usar o staffRoleId do config.json
        if (command.adminOnly && !interaction.member.roles.cache.has(adminRoleId)) {
            return interaction.reply({
                content: '❌ Você não tem permissão para usar este comando.',
                ephemeral: true
            });
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Erro ao executar comando ${interaction.commandName}:`, error);
            await interaction.reply({ 
                content: '❌ Ocorreu um erro ao executar este comando!', 
                ephemeral: true 
            });
        }
    }
});

// Login do bot usando o token do config.json
client.login(config.token);
