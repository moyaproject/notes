function escape_html(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

function is_touch_device() {
  return 'ontouchstart' in window // works on most browsers
      || 'onmsgesturechange' in window; // works on ie10
};

function format(template, data)
{
    return template.replace( /\${\s*(.*?)\s*}/g, function(m, n) {
        var node = data;
        $.each(n.split('.'), function(i, symbol){
            node = node[symbol];
        });
        return node;
    });
}

function regex_escape(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};


function fuzzy_match(text, search)
{
    var search = search.replace(/\ /g, '');
    var tokens = [];
    var i = 0;

    for (var n=0; n < text.length; n++)
    {
        if(i < search.length && text[n].toLowerCase() == search[i].toLowerCase())
        {
            tokens.push('<span class="search-highlight">' + escape_html(text[n]) + '</span>');
            i += 1;
        }
        else
        {
            tokens.push(text[n])
        }
    }
    if (i != search.length)
    {
        return '';
    }
    return tokens.join('');
}

function makeid(length)
{
    length = length || 80;
    var token = "";
    var valid_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for(var i=0; i < length; i++)
    {
        token += valid_chars.charAt(Math.floor(Math.random() * valid_chars.length));
    }

    return token;
}

function Book(note_selector, options)
{
    var self = this;
    self.$book = $(note_selector);
    self.$interface = self.$book.find('.interface');
    self.$index = self.$book.find('.notes-list');
    self.$search = self.$book.find('.controls input.search');
    self.$search_area = self.$book.find('note-seatch');
    self.$edit = self.$book.find('.note-edit');
    self.$note = self.$book.find('.note');
    self.$dialogs = self.$book.find('.dialogs');

    self.notes = {};
    self.index = [];
    self.pass = null;
    self.selection = null;
    self.max_selection = 0;
    self.displayed_search = null;
    self.edit = null;
    self.display = null;

    var rpc_url = $('input[name=notes_api]').val();
    var book = self.$book.data('book');

    self.set_mode = function(mode)
    {
        if (self.$interface.hasClass('mode-' + mode))
        {
            return;
        }
        $(['search', 'edit']).each(function(i, m){
            if(mode != m)
            {
                self.$interface.removeClass('mode-' + m);
            }
        });
        self.$interface.addClass("mode-" + mode);
        if(mode=='search')
        {
            self.$search.focus();

        }
        else if (mode=='edit')
        {
            self.$edit.find('input[name=title]').focus();

            if(!self._set_editor_events)
            {
                var h = Math.max(200, $(window).height() / 2);
                editor.composer.iframe.style.height = h + "px";
                editor.composer.element.addEventListener("focus", function() {
                    var h = Math.max(200, $(window).height() / 2);
                    editor.composer.iframe.style.height = h + "px";
                });
                editor.composer.element.addEventListener("blur", function() {
                    var h = Math.max(200, $(window).height() / 2);
                    editor.composer.iframe.style.height = h + "px";
                });
            }
            self._set_editor_events = true;

        }
        self.$dialogs.find('.deleted-note').hide();
    }

    self.on_selection = function(selection)
    {
        self.$index.find('tr').removeClass('selected');
        var $selection = self.$index.find("tr.row-" + selection);
        var action = $selection.data('action');
        if(action == 'new')
        {
            var title = self.$search.val();
            self.new_note(title);
            self.refresh_index();
        }
        else if (action == 'open')
        {
            self.selection = selection;
            self.refresh_selection();
            self.$dialogs.find('.deleted-note').hide();
            var noteid = $selection.data('noteid');
            $selection.addClass('selected');
            self.select_note(noteid);
        }
    }

    self.new_note = function(title)
    {
        self.$search.val('');
        self.$index.fadeOut('fast');
        self.edit_note('', title, '<p></p>');
    }

    self.delete_note = function(noteid)
    {
        delete self.notes[noteid];
        for(var i = 0; i < self.index.length; i++)
        {
            if(self.index[i].noteid==noteid)
            {
                self.index.splice(i, 1);
                break;
            }
        }
        self.save_index();
        self.selection = null;
        self.$index.hide();
        self.update_index();
        self.refresh_index();
        self.$note.addClass('empty');
    }

    self.update_index = function()
    {
        function cmp_titles(a, b)
        {
            var title_a = a['title'];
            var title_b = b['title']
            if (title_a < title_b) {return -1;}
            if (title_a > title_b) {return +1;}
            return 0;
        }
        self.index.sort(cmp_titles);
        self.selection = null;
    }

    self.add_to_index = function(noteid, title)
    {
        for(var i=0; i<self.index.length; i++)
        {
            if (self.index[i].noteid == noteid)
            {
                self.index[i].title = title;
                self.update_index();
                return;
            }
        }
        self.index.push({'title': title, 'noteid': noteid});
        self.update_index();
    }

    self.update_note = function(noteid, title, text)
    {
        if(!noteid)
        {
            var noteid = makeid();
            self.index.push({'title': title, 'noteid': noteid});
        }
        var note = {'noteid': noteid, 'title': title, 'text': text};
        self.notes[noteid] = note;

        for(var i = 0; i < self.index.length; i++)
        {
            if (self.index[i].noteid == noteid)
            {
                self.index[i].title = title;
                break;
            }
       }
       self.select_note(noteid);
       self.update_index();
       self.refresh_index();
    }

    self.select_note = function(noteid)
    {
        var note = self.notes[noteid];

        var got_note = function(noteid, title, text){

            self.display = noteid;
            self.edit = noteid;

            self.$edit.find('input[name=noteid]').val(noteid);
            self.$edit.find('input[name=title]').val(title);
            editor.setValue(text);
            self.$note.removeClass('empty');

            self.$note.find('.title').text(title);
            self.$note.find('.content').html(text);
            self.refresh_index();

            self.$note.show();
            self.set_mode('search');
        }

        if(!note)
        {
            self.get_note(noteid, function(note){
                self.notes[note.noteid] = note;
                got_note(note.noteid, note.title, note.text);
            });
        }
        else
        {
            got_note(note.noteid, note.title, note.text);
        }

    }

    self.edit_note = function(noteid, title, text)
    {
        self.$edit.find('input[name=noteid]').val('');
        self.$edit.find('input[name=title]').val(title);
        editor.setValue(text);
        self.set_mode('edit');
        editor.composer.element.focus();
    }

    /* self.$book.removeClass('locked'); */

    self.$book.find('.cancel-note').click(function(e){
        e.stopPropagation();
        e.preventDefault();
        self.set_mode('search');
    });

    self.$book.find('.save-note').click(function(e){
        e.stopPropagation();
        e.preventDefault();
        var noteid = self.$edit.find('input[name=noteid]').val() || makeid();
        var title = self.$edit.find('input[name=title]').val();
        var text = editor.getValue();
        self.add_to_index(noteid, title);
        self.update_note(noteid, title, text);
        self.save_note(noteid);
        self.set_mode('search');
    });

    self.$book.find('.unlocker form.passphrase').submit(function(e){
        e.preventDefault();
        $('.loading').show();
        var $form = $(this);
        $form.css('opacity', '0.3');
        var $input = $form.find('input');
        $input.prop('disabled', true);
        var raw_passphrase = $input.val();
        self.passphrase_plaintext = raw_passphrase;
        var passphrase = '' + CryptoJS.SHA3(raw_passphrase + book, {outputLength: 512});
        var params = {
            'slug': book,
            'passphrase_hash': passphrase
        }
        self.$book.find('.passphrase-incorrect').hide();
        self.rpc.call(
            'unlock',
            params,
            function(result)
            {
                $form.css('opacity', '1.0');
                $input.prop('disabled', false);

                if (result['unlocked'])
                {
                    self.$book.removeClass('locked');
                    self.pass = result['pass'];
                    self.get_index();
                }
                else
                {
                    self.$book.find('.passphrase-incorrect').fadeIn('fast');
                    self.pass = '';
                    $input.select();
                }
            }
        );

    });

    self.$search.focus(function(e){
        /*self.selection = 0;*/
        self.refresh_selection();
    });


    $('.note-search').click(function(e){
        e.stopPropagation();

    });
    $(document).click(function(e){
        self.selection = null;
        self.$index.fadeOut('fast');
    });
    $(document).keyup(function(e){
        if(e.which==27)
        {
            self.selection = null;
            self.$index.fadeOut('fast');
        }
    });

    self.$search.keyup(function(e)
    {
        if(self.$search.val() != self.displayed_search)
        {
            self.selection = 0;
            self.refresh_index();
            self.refresh_selection();
        }
    });

    self.$search.keydown(function(e){
        var UP=38;
        var DOWN=40;
        var RETURN=13;
        var ESCAPE=27;

        if(e.which==ESCAPE)
        {
            self.selection = null;
            self.$index.fadeOut('fast');
            e.preventDefault();
        }
        else if (e.which==UP)
        {
            if (self.selection > 0)
            {
                self.selection -= 1;
                self.refresh_selection();
            }
            e.preventDefault();
        }
        else if (e.which==DOWN)
        {
            if (self.selection === null)
            {
                self.selection = 0;
                self.refresh_selection();
            }
            else if (self.selection < self.max_selection)
            {
                self.selection += 1;
                self.refresh_selection();
            }
            e.preventDefault();
        }
        else if (e.which==RETURN)
        {
            e.preventDefault();
            if (self.$index.is(':visible'))
            {
                self.on_selection(self.selection);
            }
        }
    });

    self.$index.on('click', 'tr', function(e){
        var $row = $(this);
        var row = parseInt($row.attr('name'));
        self.on_selection(row);
        if(is_touch_device())
        {
            self.$index.fadeout('fast');
            return
        }
        e.stopPropagation();
        self.$search.focus();
    });

    self.$note.find('.edit-action').click(function(e){
        e.preventDefault();
        self.set_mode('edit');
    });

    self.$note.find('.delete-action').click(function(e){
        e.preventDefault();
        var $deleted = self.$book.find('.deleted-note');
        var note = self.notes[self.display];
        var text = "Note '" + note.title + "' was deleted";
        $deleted.find('.text').text(text);
        $deleted.data(note);
        self.$note.hide();
        self.delete_note(note.noteid);
        $deleted.show();
    });

    self.$book.find('.deleted-note button.undo').click(function(e){
        e.stopPropagation();
        e.preventDefault();
        var $deleted = self.$book.find('.deleted-note');
        var data = $deleted.data();
        self.add_to_index(data.noteid, data.title);
        self.update_note(data.noteid, data.title, data.text);
        $deleted.hide();
        self.$note.show();
        self.set_mode('search');
        self.save_note(data.noteid);
        self.save_index();
    });

    self.get_index = function()
    {
        var params = {
            "book": book,
            "pass": self.pass,
            "noteid": "index"
        }
        var on_result = function(result)
        {
            var index = self._decrypt(result.text);
            self.index = index || [];
            self.update_index();
            self.refresh_index();
            self.$search.focus();
            self.$index.show();
        }
        var on_error = function(code, error)
        {
            self.index = [];
            self.update_index();
            self.refresh_index();
            self.$search.focus();
            self.$index.show();
        }
        self.rpc.call('get_note',
                      params,
                      on_result,
                      {'on_error': on_error});
    }

    self.save_index = function(complete_callback)
    {
        var index_text = self._encrypt(self.index);
        var params = {
            "book": book,
            "pass": self.pass,
            "noteid": "index",
            "text": index_text
        }
        var on_result = function(result)
        {
            if (complete_callback) complete_callback(result);
        }
        self.rpc.call('set_note', params, on_result)
    }

    self.save_note = function(noteid)
    {
        var note = self.notes[noteid];
        var note_text = self._encrypt(note);
        var params = {
            "book": book,
            "pass": self.pass,
            "noteid": noteid,
            "text": note_text
        }
        var on_result = function(result)
        {
        }
        self.rpc.call('set_note', params, on_result);
        self.save_index();
    }

    self._encrypt = function(obj)
    {
        var obj_json = JSON.stringify(obj);
        var encoded = CryptoJS.Rabbit.encrypt(obj_json, self.passphrase_plaintext);
        return '' + encoded;
    }

    self._decrypt = function(cipher_text)
    {
        if(cipher_text==="")
        {
            return null;
        }
        var obj_json =  CryptoJS.Rabbit.decrypt(cipher_text, self.passphrase_plaintext).toString(CryptoJS.enc.Utf8);
        if (!obj_json)
        {
            return null;
        }
        var obj = JSON.parse(obj_json);
        return obj;
    }


    self.get_note = function(noteid, callback){
        var params = {
            "book": book,
            "pass": self.pass,
            "noteid": noteid
        }
        var on_result = function(result)
        {
            var note = self._decrypt(result.text);
            if(callback){callback(note);}
        }
        var on_error = function(id, error)
        {
            callback({noteid:noteid, title:"Missing Note", text:'<p>This note may have been deleted in another session.</p><p>Try refreshing the page...</p>'});
        }
        self.rpc.call('get_note',
                      params,
                      on_result,
                      {error:on_error});
    }

    self.refresh_selection = function()
    {
        self.$index.show();

        var $rows = self.$index.find('tr');
        var h = 0;
        for(var i=0; i<Math.min(10, $rows.length); i++)
        {
            h += $($rows[i]).height();

        }
        self.$index.height(h + 'px');
        self.$index.find('tr.active').removeClass('active');
        if(self.selection === null)
        {
            self.$index.scrollTop(0);
            return;
        }

        self.$index.find('tr.row-' + self.selection).addClass('active');
        var $table = self.$index.find('table');
        var $active = self.$index.find('tr.active');


        if($active.length == 0)
        {
            return;
        }

        var row_h = $active.height();
        var container_h = self.$index.height();
        var table_h = $table.height();

        var scroll = self.$index.scrollTop();
        var y = $active.offset().top - self.$index.offset().top + scroll;

        if (y - scroll + row_h > container_h)
        {
            self.$index.scrollTop(y - container_h + row_h);
        }
        else if (y - scroll < 0)
        {
            self.$index.scrollTop(y);
        }

    }

    self.refresh_index = function()
    {
        var search_template = '<tr name="0" data-action="new" class="row-0 search"><td><i class="fa fa-plus"></i> New note: <span class="search-text">${search}</span></td></tr>';
        var row_template = '<tr name="${row}" data-action="open" data-noteid="${note.noteid}" class="${cls}"><td><i class="fa fa-pencil"></i> ${title}</td></tr>';
        var rows = [];

        var search = self.$search.val();
        var tokens = [];
        for(var i=0; i<search.length; i++)
        {
            tokens.push('(' + regex_escape(search[i]) + ')');
        }
        var re_search_text = tokens.join('.*?');

        var row = 0;
        if(search)
        {
            var row_html = format(search_template, {'search': escape_html(search)});
            rows.push(row_html);
            row += 1
        }

        var titles = [];
        var filtered_index = [];

        for(var i=0; i < self.index.length; i++)
        {
            var note = self.index[i];
            var term = note['title'];
            if(search)
            {
                var match = fuzzy_match(term, search);
                if(match)
                {
                    filtered_index.push(note);
                    titles.push(match || escape_html(term));
                }
            }
            else
            {
                filtered_index.push(note);
                titles.push(escape_html(term));
            }
        }

        for(var i=0; i < filtered_index.length; i++)
        {
            var note = filtered_index[i];
            var title = titles[i];
            var classes = ['row-' + row];
            if(row == self.selection)
            {
                classes.push('active');
            }
            if (note.noteid == self.display)
            {
                classes.push('selected');
            }
            var cls = classes.join(' ');
            var td = {
                "row": row,
                "note": note,
                "cls": cls,
                "title": title
            }
            var row_html = format(row_template, td);
            rows.push(row_html);
            row += 1;
        }

        self.displayed_search = search;
        self.max_selection = row - 1;
        var html = rows.join('\n');
        self.$index.find('tbody').html(html);
    }

    self.on_tasks = function(tasks)
    {
        if (tasks)
        {
            self.$book.find('.loading').show();
        }
        else
        {
            self.$book.find('.loading').hide();
        }
    }

    self.rpc = new JSONRPC(rpc_url, {'tasks': self.on_tasks});

    $('.notes .unlocker').removeClass('start');
    self.index = [];
    self._set_editor_events = false;
    create_editor();

    self.refresh_index();
    self.$book.find('input[name=passphrase]').focus();
    return self;
}

function create_editor()
{
    var css_url = $('#moya-editor').data('cssurl');
    editor = null;
    editor = new wysihtml5.Editor("editor",{
        toolbar: "editor-toolbar",
        parserRules: wysihtml5ParserRules,
        useLineBreaks: false,
        stylesheets: [css_url]
    });
}

$(function(){

    if ($('#Book').length)
    {
        var book = new Book('#Book', {});
    }


    $("form.new-book").submit(function(e){

        var $form = $('form.new-book');
        var slug = $form.find('input[name=slug]').val();
        var passphrase = $form.find('input[name=passphrase]').val();
        var hashed = $form.find('input[name=hashed]').val();

        $form.find('fieldset').attr('disable', 'disabled');

        if (!hashed)
        {
            e.preventDefault();
            $form.find('fieldset').attr('disable', 'disabled');
            $form.css('opacity', '0.2');
            $('.loading').show();

            setTimeout(function(){
                var slug = $form.find('input[name=slug]').val().toLowerCase();
                var slug = slug.replace(/\ /g, "-");
                $form.find('input[name=slug]').val(slug);
                var passphrase_hash = CryptoJS.SHA3(passphrase + slug, {outputLength: 512});
                $form.find('input[name=passphrase]').val(passphrase_hash);
                $form.find('input[name=hashed]').val('y');
                $form.submit();
                $form.find('input[name=hashed]').val('');
            }, 100);
        }

    });

});