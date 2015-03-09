# Install Encrypted Notes

So you want to self-host this web application?

## Requirements


If you don't have a Python development environment set up, you will need to do the following:

````
wget https://bootstrap.pypa.io/get-pip.py
sudo python get-pip.py
sudo pip install moya
````

If you have pip installed, you will just need the last step.

## Development

To run a *development* server, navigate to `site/` and run the following:

```
moya db sync
moya auth#cmd.init
```

This will create a database and initial user. To run the server do the following:

```
moya runserver
```

Then visit http://127.0.0.1:8000

## Configure

By default this application will use a SQLITE application (db stored in a local file). In a production environment, you will probably want to use another SQL database.

To do this, create `local.ini` and put your db settings there. For example:

```
extends=production.ini

[db:main]
engine = mysql://USER:PASSWORD@localhost/mynotes
echo = no
default = yes
```

## Deploy

To deploy the app, you will need to follow the advice for deploying a Python web application with WSGI (search google for 'deploy wsgi application'). The WSGI application can be found in `site/wsgi.py`.

For example, if you are using gunicorn (http://gunicorn.org/), you could run the application with the following:

```
gunicorn wsgi:application
```


## More Information

For more information on deploying a Moya site, please see http://docs.moyaproject.com/0.5/en/deploy.html

For development documentation see http://docs.moyaproject.com

