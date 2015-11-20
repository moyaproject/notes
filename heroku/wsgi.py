# encoding=UTF-8
from __future__ import unicode_literals
from moya.wsgi import Application

application = Application('./', ['heroku.ini'], server='main', logging='logging.ini')
