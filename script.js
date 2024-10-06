/*
    Files

    Copyright (C) LiveG. All Rights Reserved.

    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

import * as common from "./common.js";

var $g = await import(`${common.AUI_URL_PREFIX}/src/adaptui.js`);
var astronaut = await import(`${common.AUI_URL_PREFIX}/astronaut/astronaut.js`);

window.$g = $g;

astronaut.unpack();

$g.waitForLoad().then(function() {
    $g.sel("head").add($g.create("link")
        .setAttribute("rel", "stylesheet")
        .setAttribute("href", `${common.AUI_URL_PREFIX}/src/adaptui.css`)
        .on("load", function() {
            $g.sel("body").removeAttribute("hidden");
        })
    );

    return $g.l10n.selectLocaleFromResources({
        "en_GB": "locales/en_GB.json"
    });
}).then(function(locale) {
    window._ = function() {
        return locale.translate(...arguments);
    };

    $g.sel("title").setText(_("files"));

    astronaut.render(Screen(true) (
        Header (
            Text(_("files"))
        ),
        Page(true) (
            Section (
                Heading() ("Hello, world!"),
                Paragraph() ("Welcome to the Files app!")
            )
        )
    ));
});