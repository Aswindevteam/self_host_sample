FROM node:20-alpine
WORKDIR /usr/src/app
RUN npm install -g serve
COPY . .
EXPOSE 3000
CMD ["serve", "-s", ".", "-l", "3000"]
