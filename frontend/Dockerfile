# --- Stage 1: Build โค้ด React ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Stage 2: นำไฟล์นิ่งๆ ไปรันบน Nginx Server ---
FROM nginx:alpine
# ก๊อปปี้ไฟล์หน้าเว็บที่ Build เสร็จจาก Stage แรกไปวางในโฟลเดอร์รันงานของ Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# เปิดพอร์ต 80 สำหรับเรียกดูหน้าเว็บผ่านเบราว์เซอร์
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]