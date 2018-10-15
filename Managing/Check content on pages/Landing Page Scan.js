/**
 *
 * Google Ads Script, который сканирует содержание посадочных страниц.
 *
 * Version: 1.0
 * Google AdWords Script maintained by brainlabsdigital.com
 * Скрипт адаптирован специалистами агентства Penguin-team
 * © 2018 Penguin-team, Ukraine
 * https://pengstud.com/
 **/

function main() {

    var messagesToCheckFor = ["нет в наличии", "отсутсвует"];
    // Нужно указать слова, при наличии которых необходимо отправлять отчет.

    var trimAtQuestionMark = true;

    var type = "keywords";
    // Выбрать "keywords" или "ads" в зависимости от того, где стоит final url.


    var recipients = ["a@b.com"];
    // Указать почту, куда должен уходить отчет пример: ["a@b.com"] или ["a@b.com","c@d.com","e@g.co.uk"]


    var containsArray = [];
    // Если поставить название кампаний, то будет проверка только в этих кампаниях.

    var excludesArray = [];
    // Если указать название кампаний, то они будут исключены из проверки.

    var labelArray = [];
    // Если поставить название ярлыка, то будут проверены, только те слова, где есть этот ярлык.


    var campaignStatus = ["ENABLED"];
    // Будут проверены только включенные кампании.

    var adGroupStatus = ["ENABLED"];
    // Будут проверены только включенные группы.

    var status = ["ENABLED"];
    // Будут проверены только включенные объявления.


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//


    var urls = [];
    var bad_urls = [];
    var urlFetchOptions = {muteHttpExceptions: true};
    var countEntities = 0;


    var conditions = [];
    if (containsArray.length > 0) {
        conditions.push(" where the campaign name contains " + containsArray.join(", "));
    }
    if (excludesArray.length > 0) {
        conditions.push(" where the campaign name excludes " + excludesArray.join(", "));
    }
    if (labelArray.length > 0) {
        conditions.push(" where the " + type + " are labelled " + labelArray.join(", "));
    }

    if (containsArray.length === 0) {
        containsArray.push("");
    }

    for (var i = 0; i < containsArray.length; i++) {
        var string = iteratorConstructor(type, containsArray[i], excludesArray, labelArray, status, campaignStatus, adGroupStatus);
        eval(string);
        countEntities += iterator.totalNumEntities();
        excludesArray.push(containsArray[i]);
        while (iterator.hasNext()) {
            var object = iterator.next();
            var url = object.urls().getFinalUrl();

            if (url == null || url == undefined) {
                url = object.getDestinationUrl();
            }

            if (url !== null && url !== undefined) {
                if (trimAtQuestionMark) {
                    url = url.split('?')[0];
                }
                if (urls.indexOf(url) === -1) {
                    urls.push(url);
                }
            }
        }
    }

    if (countEntities == 0) {
        throw "No " + type + " found" + conditions.join("; and");
    }
    Logger.log(countEntities + " " + type + " found" + conditions.join("; and"));
    Logger.log(urls.length + " unique URLs to check.");

    for (var x in urls) {
        var response = UrlFetchApp.fetch(urls[x], urlFetchOptions);
        var code = response.getContentText();
        for (var y = 0; y < messagesToCheckFor.length; y++) {
            var message = messagesToCheckFor[y];
            if (code.indexOf(message) !== -1) {
                bad_urls.push(urls[x]);
                break;
            }
        }
    }

    if (bad_urls.length === 0) {
        Logger.log("No bad URLs found.");
    } else {
        Logger.log(bad_urls.length + " found:");
        Logger.log(bad_urls.join("\n"));
    }

    if (recipients.length > 0 && bad_urls.length > 0) {
        var name = AdWordsApp.currentAccount().getName();
        var subject = name + " URL checking";
        var body = 'The following URLs were found to have one of the following phrases in their web page source code. \n\nPhrases:\n"' + messagesToCheckFor.join('",\n"') + '"\n\nURLs:\n';
        body += bad_urls.join("\n");
        MailApp.sendEmail(recipients.join(","), subject, body);
        Logger.log("Email sent to " + recipients.join(", "));
    }

    function iteratorConstructor(type, containsString, excludesArray, labelArray, status, campaignStatus, adGroupStatus) {

        var string = "var iterator = AdWordsApp." + type + "()";
        if (containsString != "") {
            string = string + ".withCondition('CampaignName CONTAINS_IGNORE_CASE " + '"' + containsString + '"' + "')";
        }
        for (var i = 0; i < excludesArray.length; i++) {
            string = string + ".withCondition('CampaignName DOES_NOT_CONTAIN_IGNORE_CASE " + '"' + excludesArray[i] + '"' + "')";
        }
        if (labelArray.length > 0) {
            string = string + ".withCondition('LabelNames CONTAINS_ANY " + '["' + labelArray.join('","') + '"]' + "')";
        }

        string = string + ".withCondition('Status IN [" + status.join(",") + "]')";
        string = string + ".withCondition('CampaignStatus IN [" + campaignStatus.join(",") + "]')";
        string = string + ".withCondition('AdGroupStatus IN [" + adGroupStatus.join(",") + "]')";
        string = string + ".orderBy('Cost DESC').forDateRange('LAST_30_DAYS')";
        string = string + ".withLimit(50000)";

        string = string + ".get();"

        return string;

    }

}