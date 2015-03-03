Getting Started
===============

This file was created by running the command 'moya start project'. The other
files in this directory contain a Moya project tailored to your requirements,
based on your responses to the start project command.

There are a few quick steps you need to run before you can begin developing
your website. If you haven't already done so, open up a terminal and navigate
to the same directory that contains this file.

If you opted for a database, review the database settings in 'settings.ini'.
The default settings will automatically create an sqlite database in this
directory.

After you have reviewed the database settings run the following command to
'synchronize' the database (i.e. create required tables):

    moya db sync

If you enabled Moya auth support, run the following command to create initial
permissions / groups and an admin user:

    moya auth#cmd.init

Use the following command to run a development server:

    moya runserver

If all goes well, Moya will let you know it is serving your web site. Point
your browser at http://127.0.0.1:8000 to see it.

See http://moyaproject.com/gettingstarted/ for more information.
