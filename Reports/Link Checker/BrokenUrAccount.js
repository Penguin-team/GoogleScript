/****************************
 * Find Broken Urls In Your Account
 * Created By: Russ Savage
 * FreeAdWordsScripts.com
 * Скрипт адаптирован специалистами агентства Penguin-team
 * © 2018 Penguin-team, Ukraine
 * https://pengstud.com/


 ****************************/
function main() {
    // Можно добавить больше ошибок, можно посмотреть в статье: http://goo.gl/VhIX
    var BAD_CODES = [404, 500];
    var TO = ['test@gmail.com'/* Нужно поставить свою актуальную почту'email_address_2@example.com'*/];
    var SUBJECT = 'Broken Url Report - ' + _getDateString();
    var HTTP_OPTIONS = {
        muteHttpExceptions: true
    };

    //Let's look at ads and keywords for urls
    var iters = [
        //For Ad Level Urls
        AdWordsApp.ads()
            .withCondition("Status = 'ENABLED'")
            .withCondition("AdGroupStatus = 'ENABLED'")
            .withCondition("CampaignStatus = 'ENABLED'")
            .get()//,
        //For Keyword Level Urls
        /*AdWordsApp.keywords()
          .withCondition("Status = 'ENABLED'")
          .withCondition("AdGroupStatus = 'ENABLED'")
          .withCondition("CampaignStatus = 'ENABLED'")
          .get()*/
    ];

    var already_checked = {};
    var bad_entities = [];
    for (var x in iters) {
        var iter = iters[x];
        while (iter.hasNext()) {

            var entity = iter.next();

            Logger.log("url" + entity.urls().getFinalUrl());
            if (entity.urls().getFinalUrl() == null) {
                continue;
            }
            var url = entity.urls().getFinalUrl();
            if (url.indexOf('{') >= 0) {
                //Let's remove the value track parameters
                url = url.replace(/\{[0-9a-zA-Z]+\}/g, '');
            }

            if (already_checked[url]) {
                continue;
            }
            var response_code;

            try {
                Logger.log("Testing url: " + url);
                response_code = UrlFetchApp.fetch(url, HTTP_OPTIONS).getResponseCode();
            } catch (e) {
                //Something is wrong here, we should know about it.
                bad_entities.push({e: entity, code: -1});
            }
            if (BAD_CODES.indexOf(response_code) >= 0) {
                //This entity has an issue.  Save it for later.
                bad_entities.push({e: entity, code: response_code});
                bad_entities.push({e: entity, code: response_code});
            }
            already_checked[url] = true;
        }
    }
    //var column_names = ['Type','CampaignName','AdGroupName','Id','Headline/KeywordText','ResponseCode','DestUrl'];
    var column_names = ['CampaignName', 'AdGroupName'];
    var attachment = column_names.join(",") + "\n";
    /* for(var i in bad_entities) {
       attachment += _formatResults(bad_entities[i],",");

     }*/
    if (bad_entities.length > 0) {

        var htmlBody = '<html><body>';
        htmlBody += '<br/ ><br/ >';
        htmlBody += '<table border="1" width="95%" style="border-collapse:collapse;">';
        htmlBody += '<tr>';
        htmlBody += '<td align="left"><b>CampaignName</b></td>';
        htmlBody += '<td align="left"><b>AdGroupName</b></td>';
        htmlBody += '<td align="center"><b>Id</b></td>';
        htmlBody += '<td align="center"><b>Headline/KeywordText</b></td>';
        htmlBody += '<td align="center"><b>ResponseCode</b></td>';
        htmlBody += '<td align="center"><b>DestUrl</b></td>';
        htmlBody += '</tr>';


        // var options = { attachments: [Utilities.newBlob(attachment, 'text/csv', 'bad_urls_'+_getDateString()+'.csv')] };

        var options = {};

        var additionalText = '';
        for (var i in bad_entities) {
            // attachment += _formatResults(bad_entities[i],",");
            var entity = bad_entities[i];

            var e = entity.e;
            if (typeof(e['getHeadline']) != "undefined") {
                //this is an ad entity
                htmlBody += '<tr><td align="left">' + e.getCampaign().getName() +
                    '</td><td align="left">' + e.getAdGroup().getName() +
                    '</td><td align="left">' + e.getId() +
                    '</td><td align="center">' + e.getHeadline() +
                    '</td><td align="center">' + entity.code +
                    '</td><td align="center">' + e.getDestinationUrl() +
                    '</td>';

                Logger.log(e.getCampaign().getName(),
                    e.getAdGroup().getName(),
                    e.getId(),
                    e.getHeadline(),
                    entity.code,
                    e.getDestinationUrl())
            } else {


                htmlBody += '<tr><td align="left">' + e.getCampaign().getName() +
                    '</td><td align="left">' + e.getAdGroup().getName() +
                    '</td><td align="left">' + e.getId() +
                    '</td><td align="center">' + e.getText() +
                    '</td><td align="center">' + entity.code +
                    '</td><td align="center">' + e.getDestinationUrl() +
                    '</td>';


            }

        }
        var SUBJECT = 'Bad urls';
        var email_body = "There are " + bad_entities.length + " urls that are broken. \n";
        // Logger.log(additionalText);

        var options = {htmlBody: htmlBody};
        for (var i in TO) {
            MailApp.sendEmail(TO[i], SUBJECT, email_body, options);
        }
    }
}

//Formats a row of results separated by SEP
function _formatResults(entity, SEP) {
    var e = entity.e;
    if (typeof(e['getHeadline']) != "undefined") {
        //this is an ad entity
        return ["Ad",
            e.getCampaign().getName(),
            e.getAdGroup().getName(),
            e.getId(),
            e.getHeadline(),
            entity.code,
            e.getDestinationUrl()
        ].join(SEP) + "\n";
    } else {
        // and this is a keyword
        return ["Keyword",
            e.getCampaign().getName(),
            e.getAdGroup().getName(),
            e.getId(),
            e.getText(),
            entity.code,
            e.getDestinationUrl()
        ].join(SEP) + "\n";
    }
}

//Helper function to format todays date
function _getDateString() {
    return Utilities.formatDate((new Date()), AdWordsApp.currentAccount().getTimeZone(), "yyyy-MM-dd");
}