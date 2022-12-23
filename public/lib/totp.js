/*
 Generates a TOTP code given a secret.

 This script requires jsSHA (https://github.com/Caligatio/jsSHA) to work.

 Usage:

 var code = getTotpCode(secret);
 */

function decToHex(s)
{
    return (s < 15.5 ? '0' : '') + Math.round(s).toString(16);
}

function hexToDec(s)
{
    return parseInt(s, 16);
}

function base32ToHex(base32)
{
    var base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    var bits = "";
    var hex = "";

    for (var i = 0; i < base32.length; i++)
    {
        var val = base32chars.indexOf(base32.charAt(i).toUpperCase());
        bits += leftPad(val.toString(2), 5, '0');
    }

    while (bits.length % 4 != 0)
        bits = "0" + bits;

    for (var i = bits.length - 4; i >= 0; i = i - 4)
    {
        var chunk = bits.substr(i, 4);
        hex = parseInt(chunk, 2).toString(16) + hex;
    }

    return hex;
}

function leftPad(str, len, pad)
{
    if (len + 1 >= str.length)
        str = new Array(len + 1 - str.length).join(pad) + str;

    return str;
}

function getTotpCode(secret)
{
    var key = base32ToHex(secret);
    //var epoch = Math.round(new Date().getTime() / 1000.0);
    //var time = leftPad(decToHex(Math.floor(epoch / 30)), 16, '0');
    //var hmacObj = new jsSHA(time, 'HEX');
    //var hmac = hmacObj.getHMAC(key, 'HEX', 'SHA-1', "HEX");
    var shaObj = new jsSHA("SHA-512", "TEXT");
    shaObj.setHMACKey(key, "TEXT");
    shaObj.update("%#^^Q$@WRF^#^&$^$^&$^#^#^$&");
    var hmac = shaObj.getHMAC("HEX");

    var offset = hexToDec(hmac.substring(hmac.length - 1));

    var otp = (hexToDec(hmac.substr(offset * 2, 8)) & hexToDec('7fffffff')) + '';
    otp = otp.substr(otp.length - 6, 6);

    return otp;
}