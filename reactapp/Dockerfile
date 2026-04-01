FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

# Set production environment
ENV REACT_APP_API_BASE_URL=https://task-sphere-django.vercel.app
ENV REACT_APP_ENV=production

CMD ["npm", "start"]
