FROM node:18-alpine
WORKDIR /app
RUN npm install -g @agentreadyweb/mcp
CMD ["agentready-mcp"]
