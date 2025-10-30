# /Dockerfile (NOVO ARQUIVO)

# --- Estágio 1: Build (Instalação de dependências) ---
# Usamos a versão 22 do Node (conforme discutimos)
FROM node:22-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependência
COPY package.json package-lock.json ./

# Instala apenas as dependências de produção (e 'sharp' que precisa de build)
# Otimiza a instalação para produção
RUN npm install --production --include=dev sharp

# --- Estágio 2: Produção (Cria a imagem final) ---
FROM node:22-alpine

WORKDIR /app

# Copia as dependências instaladas do estágio 'builder'
COPY --from=builder /app/node_modules ./node_modules

# Copia o código da aplicação (backend e frontend)
COPY ./backend ./backend
COPY ./public ./public

# Define o usuário padrão como 'node' (mais seguro que 'root')
USER node

# Expõe a porta que o server.js usa
EXPOSE 3055

# Variável de ambiente para garantir que o app rode em modo de produção
ENV NODE_ENV production

# Comando para iniciar a aplicação
CMD ["node", "backend/server.js"]