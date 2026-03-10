# DDoS Protection Config

This directory contains `index.php` which acts as a rate limiter and bad-bot defender for the application.
Since you don't have PHP installed globally, you'll need to run this behind a standard server like Apache (XAMPP/WAMP), Nginx, or a production environment that supports PHP.

## How to use

1. Place your main application behind a reverse proxy (like Nginx).
2. Configure your server to route all traffic through `index.php` first.
3. The script will block abusive IPs and pass normal traffic through.

## Local Testing
To test the script locally, deploy this folder to a local XAMPP/WAMP `htdocs` directory and run the `test_ddos.py` script against the local address.
