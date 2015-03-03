# encoding=UTF-8from __future__ import unicode_literals
from moya.wsgi import Application

application = Application('./', ['local.ini', 'production.ini'], server='main', logging='prodlogging.ini')
