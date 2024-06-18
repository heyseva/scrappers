sudo docker build -t scrapper .
sudo docker run -d -p 4001:80 scrapper
sudo docker ps --all
sudo docker stop container_id
sudo docker delete container_id
