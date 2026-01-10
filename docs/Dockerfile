FROM php:8.3-apache
WORKDIR /var/www/html
COPY . /var/www/html
# If you use composer, enable extensions, etc. customize here.
EXPOSE 8080
ENV PORT=8080
RUN sed -i "s/80/${PORT}/g" /etc/apache2/ports.conf /etc/apache2/sites-enabled/000-default.conf
