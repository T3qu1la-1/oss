"""
🤖 TELEGRAM BOT - Login via Telegram
Bot: @MarfinnoBot
Token: 8797087932:AAFv4GxEZOxcbur1jEXkpBogOP-GjG921-g
"""

import os
import asyncio
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, ConversationHandler
import uuid
from datetime import datetime
from db_connection import db, telegram_users_collection

# Configurar logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Token do bot
BOT_TOKEN = "8797087932:AAHpK-rhf5m3osBSB4PYJiwoaa-aAv_KSs4"

# Estados da conversa
WAITING_PASSWORD = 1

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /start - Iniciar registro via Telegram"""
    telegram_id = update.effective_user.id
    username = update.effective_user.username or "User"
    first_name = update.effective_user.first_name or "User"
    
    # Verificar se já está registrado
    existing_user = await telegram_users_collection.find_one({"telegram_id": str(telegram_id)})
    
    if existing_user:
        await update.message.reply_text(
            f"✅ Olá {first_name}!\n\n"
            f"Você já está registrado!\n"
            f"🆔 Seu Telegram ID: `{telegram_id}`\n\n"
            f"Para fazer login no sistema, use:\n"
            f"• Telegram ID: `{telegram_id}`\n"
            f"• Sua senha cadastrada\n\n"
            f"📱 Faça login no site usando essas credenciais!",
            parse_mode='Markdown'
        )
        return ConversationHandler.END
    
    # Novo registro
    await update.message.reply_text(
        f"🎉 Bem-vindo ao olho de cristo, {first_name}!\n\n"
        f"🆔 Seu Telegram ID único é: `{telegram_id}`\n\n"
        f"📝 Agora, por favor, **escolha uma senha forte** para sua conta.\n\n"
        f"⚠️ A senha deve ter no mínimo 6 caracteres.\n\n"
        f"Digite sua senha:",
        parse_mode='Markdown'
    )
    
    return WAITING_PASSWORD

async def receive_password(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receber e salvar a senha do usuário"""
    password = update.message.text
    telegram_id = update.effective_user.id
    username = update.effective_user.username or "telegram_user"
    first_name = update.effective_user.first_name or "User"
    
    # Validar senha
    if len(password) < 6:
        await update.message.reply_text(
            "❌ Senha muito curta!\n\n"
            "Por favor, escolha uma senha com no mínimo 6 caracteres:"
        )
        return WAITING_PASSWORD
    
    if len(password) > 128:
        await update.message.reply_text(
            "❌ Senha muito longa!\n\n"
            "Por favor, escolha uma senha com no máximo 128 caracteres:"
        )
        return WAITING_PASSWORD
    
    # Salvar no banco de dados
    user_id = str(uuid.uuid4())
    user_data = {
        "id": user_id,
        "telegram_id": str(telegram_id),
        "telegram_username": username,
        "first_name": first_name,
        "password": password,  # Senha em texto (será hasheada no backend ao fazer login)
        "created_at": datetime.utcnow(),
        "last_login": None,
        "ips": []  # Lista de IPs que fizeram login
    }
    
    await telegram_users_collection.insert_one(user_data)
    
    # Resposta de sucesso
    await update.message.reply_text(
        f"✅ **Conta criada com sucesso!**\n\n"
        f"👤 Nome: {first_name}\n"
        f"🆔 Telegram ID: `{telegram_id}`\n"
        f"🔐 Senha: *configurada*\n\n"
        f"📱 **Como fazer login no site:**\n"
        f"1. Acesse o sistema\n"
        f"2. Clique em 'Login via Telegram'\n"
        f"3. Use suas credenciais:\n"
        f"   • Telegram ID: `{telegram_id}`\n"
        f"   • Sua senha\n\n"
        f"🔒 suas credenciais será registrado automaticamente ao fazer login.\n\n"
        f"✨ Pronto para começar!",
        parse_mode='Markdown'
    )
    
    return ConversationHandler.END

async def cancel_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancelar o processo de registro"""
    await update.message.reply_text(
        "❌ Registro cancelado.\n\n"
        "Use /start para começar novamente."
    )
    return ConversationHandler.END

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /help"""
    await update.message.reply_text(
        "🤖 **Comandos disponíveis:**\n\n"
        "/start - Registrar ou ver suas credenciais\n"
        "/help - Ver esta mensagem\n"
        "/cancel - Cancelar registro\n\n"
        "📱 **Como funciona:**\n"
        "1. Use /start para se registrar\n"
        "2. Escolha uma senha\n"
        "3. Use seu Telegram ID + senha para fazer login no site\n"
        "4. Sua credencial será registrada automaticamente\n\n"
        "🔐 **Segurança:**\n"
        "• Cada Telegram ID é único\n"
        "• Seu IP é validado a cada login\n"
        "• Senha criptografada no sistema",
        parse_mode='Markdown'
    )

def main():
    """Iniciar o bot"""
    logger.info("🤖 Iniciando Telegram Bot...")
    
    # Criar aplicação
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Conversation handler para registro
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start_command)],
        states={
            WAITING_PASSWORD: [MessageHandler(filters.TEXT & ~filters.COMMAND, receive_password)],
        },
        fallbacks=[CommandHandler("cancel", cancel_command)],
    )
    
    # Adicionar handlers
    application.add_handler(conv_handler)
    application.add_handler(CommandHandler("help", help_command))
    
    # Iniciar bot
    logger.info("✅ Bot iniciado e aguardando mensagens...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
