/*
    Files

    Copyright (C) LiveG. All Rights Reserved.

    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

var sphere = typeof(_sphere) != "undefined" ? _sphere : null;

export const IS_SYSTEM_APP = sphere?.isSystemApp();
export const AUI_URL_PREFIX = IS_SYSTEM_APP ? "gshell://lib/adaptui" : "https://opensource.liveg.tech/Adapt-UI";