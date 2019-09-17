/**
 *
 * Скрипт, который позволяет показывать объявления по точному соответствию кс, без близких вариантов.
 *
 * Автоматически добавляет в минус-слова, слова, которые отличаются от точного соответствия.
 *
 *
 * Скрипт разработан brainlabsdigital.com
 * Скрипт адаптирован специалистами агентства Penguin-team
 * © 2018 Penguin-team, Ukraine
 * https://pengstud.com/
 *
 **/


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//Опции

var campaignNameDoesNotContain = [];
// Нужно вписать кампании, которые нужно исключить.
// Пример["Brand"] будет игнорировать все кампании в которых есть слово 'brand'
// Оставьте пустым [], если исключать кампании не нужно.
// Если вы хотите добавить несколько кампаний, перечислите их в формате ["brand1","brand2","brand3"]

var campaignNameContains = [];
// Нужно вписать кампании, которые нужно включить в отработку скрипта.
// Пример["Brand"], скрипт будет срабатывать в кампаниях в которых есть слово 'brand'
// Оставьте пустым [], если нужно включить все кампании.
// Если вы хотите добавить несколько кампаний, перечислите их в формате ["brand1","brand2","brand3"]


// Если, нужно, чтобы скрипт вносил минус-слова в РК, оставьте "true", если хотите получать слова только на почту впишите false.
var makeChanges = true;

// Добавьте email, куда нужно предварительно высылать слова "daniel@example.com"
// Оставьте пустым "" если не нужно высылать email.
var emailAddresses = "";


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
function main() {

    var campaigns = {};
    var adGroups = {};
    var exactKeywords = [];
    var exactGroupIds = {};


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    //Pull a list of all exact match keywords in the account
    var campaignIds = getCampaignIds();

    var report = AdWordsApp.report(
        "SELECT AdGroupId, Id, Criteria " +
        "FROM KEYWORDS_PERFORMANCE_REPORT " +
        "WHERE Impressions > 0 AND KeywordMatchType = EXACT " +
        "AND CampaignId IN [" + campaignIds.join(",") + "] " +
        "AND AdGroupStatus IN [ENABLED, PAUSED] " +
        "AND Status IN [ENABLED, PAUSED] " +
        "DURING LAST_30_DAYS");

    var rows = report.rows();
    while (rows.hasNext()) {
        var row = rows.next();
        var keywordId = row['Id'];
        var adGroupId = row['AdGroupId'];
        exactKeywords.push(adGroupId + "#" + keywordId);
        exactGroupIds[adGroupId] = true;

        if (!adGroups.hasOwnProperty(adGroupId)) {
            adGroups[adGroupId] = [[], [], []];
        }
        adGroups[adGroupId][2].push(row['Criteria'].toLowerCase().trim());
    }

    exactGroupIds = Object.keys(exactGroupIds);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    // Remove ad groups with non-exact keywords

    var nonExactGroupIds = {};
    for (var i = 0; i < exactGroupIds.length; i += 10000) {
        var exactGroupIdsChunk = exactGroupIds.slice(i, i + 10000);
        var report = AdWordsApp.report(
            "SELECT AdGroupId, Id " +
            "FROM KEYWORDS_PERFORMANCE_REPORT " +
            "WHERE KeywordMatchType != EXACT AND IsNegative = FALSE " +
            "AND AdGroupId IN [" + exactGroupIdsChunk.join(",") + "] " +
            "AND Status IN [ENABLED, PAUSED] " +
            "DURING LAST_30_DAYS");

        var rows = report.rows();
        while (rows.hasNext()) {
            var row = rows.next();
            var adGroupId = row['AdGroupId'];
            nonExactGroupIds[adGroupId] = true;
        }
    }

    var onlyExactGroupIds = [];
    for (var i = 0; i < exactGroupIds.length; i++) {
        if (nonExactGroupIds[exactGroupIds[i]] == undefined) {
            onlyExactGroupIds.push(exactGroupIds[i]);
        }
    }
    Logger.log(onlyExactGroupIds.length + " ad groups (with only exact keywords) were found.");


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    //Pull a list of all exact (close variant) search queries

    for (var i = 0; i < onlyExactGroupIds.length; i += 10000) {
        var onlyExactGroupIdsChunk = onlyExactGroupIds.slice(i, i + 10000);
        var report = AdWordsApp.report(
            "SELECT Query, AdGroupId, CampaignId, KeywordId, KeywordTextMatchingQuery, Impressions, QueryMatchTypeWithVariant, AdGroupName " +
            "FROM SEARCH_QUERY_PERFORMANCE_REPORT " +
            "WHERE AdGroupId IN [" + onlyExactGroupIdsChunk.join(",") + "] " +
            "DURING LAST_30_DAYS");

        var rows = report.rows();
        while (rows.hasNext()) {
            var row = rows.next();
            var adGroupId = parseInt(row['AdGroupId']);
            var campaignId = parseInt(row['CampaignId']);
            var keywordId = parseInt(row['KeywordId']);
            var searchQuery = row['Query'].toLowerCase().trim();
            var keyword = row['KeywordTextMatchingQuery'].toLowerCase().trim();
            var matchType = row['QueryMatchTypeWithVariant'].toLowerCase().trim();
            if (keyword !== searchQuery && matchType.indexOf("exact (close variant)") !== -1) {

                if (adGroups[adGroupId][2].indexOf(searchQuery) > -1) {
                    // This query is a positive keyword in the ad group
                    // so we don't want to add is as a negative
                    continue;
                }

                if (!campaigns.hasOwnProperty(campaignId)) {
                    campaigns[campaignId] = [[], []];
                }

                campaigns[campaignId][0].push(searchQuery);
                campaigns[campaignId][1].push(adGroupId + "#" + keywordId);

                if (!adGroups.hasOwnProperty(adGroupId)) {
                    adGroups[adGroupId] = [[], []];
                }

                adGroups[adGroupId][0].push(searchQuery);
                adGroups[adGroupId][1].push(adGroupId + "#" + keywordId);
            }
        }
    }


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    //Parse data correctly

    var adGroupIds = [];
    var adGroupNegatives = [];

    for (var x in adGroups) {
        adGroupIds.push(parseInt(x));
        adGroupNegatives.push([]);
        for (var y = 0; y < adGroups[x][0].length; y++) {
            var keywordId = adGroups[x][1][y];
            var keywordText = adGroups[x][0][y];
            if (exactKeywords.indexOf(keywordId) !== -1) {
                adGroupNegatives[adGroupIds.indexOf(parseInt(x))].push(keywordText);
            }
        }
    }


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    //Create the new negative exact keywords

    var results = [];
    for (var i = 0; i < adGroupIds.length; i += 10000) {
        var adGroupIdsChunk = adGroupIds.slice(i, i + 10000);
        var adGroupIterator = AdWordsApp.adGroups()
            .withIds(adGroupIdsChunk)
            .get();
        while (adGroupIterator.hasNext()) {
            var adGroup = adGroupIterator.next();
            var adGroupId = adGroup.getId();
            var adGroupName = adGroup.getName();
            var adGroupIndex = adGroupIds.indexOf(adGroupId);
            var campaignName = adGroup.getCampaign().getName();
            for (var j = 0; j < adGroupNegatives[adGroupIndex].length; j++) {
                if (makeChanges) {
                    adGroup.createNegativeKeyword("[" + adGroupNegatives[adGroupIndex][j] + "]");
                }
                results.push([campaignName, adGroupName, adGroupNegatives[adGroupIndex][j]]);
            }
        }
    }

    if (!makeChanges || AdWordsApp.getExecutionInfo().isPreview()) {
        Logger.log(results.length + " new negatives were found.");
    } else {
        Logger.log(results.length + " new negatives were created.");
    }


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    //Email the results

    if (emailAddresses == "") {
        Logger.log("No email addresses given - not sending email.");
    } else if (results.length == 0) {
        Logger.log("No changes to email.");
    } else {

        var attachments = [];
        var headers = ["Campaign", "Ad Group", "Negative"];
        attachments.push(createEscapedCsv([headers].concat(results), "Ad-Group-Negatives.csv"));

        if (!makeChanges || AdWordsApp.getExecutionInfo().isPreview()) {
            var verb = "would be";
        } else {
            var verb = "were";
        }
        var subject = AdWordsApp.currentAccount().getName() + " - Making Exact Match Exact - " + Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd");
        var body = "Please find attached a list of the " + results.length + " negative keywords that " + verb + " added to your account.";

        var options = {attachments: attachments};
        MailApp.sendEmail(emailAddresses, subject, body, options);

    }

}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
// Prepare an array to be made into a CSV
function createEscapedCsv(array, csvName) {
    var cells = [];
    for (var i = 0; i < array.length; i++) {
        var row = [];
        for (var j = 0; j < array[i].length; j++) {
            row.push(array[i][j].replace(/"/g, '""'));
        }
        cells.push('"' + row.join('","') + '"');
    }
    return Utilities.newBlob("\ufeff" + cells.join("\n"), 'text/csv', csvName);
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
// Get the IDs of campaigns which match the given options
function getCampaignIds() {
    var whereStatement = "";
    var whereStatementsArray = [];
    var campaignIds = [];

    for (var i = 0; i < campaignNameDoesNotContain.length; i++) {
        whereStatement += "AND CampaignName DOES_NOT_CONTAIN_IGNORE_CASE '" + campaignNameDoesNotContain[i].replace(/"/g, '\\\"') + "' ";
    }

    if (campaignNameContains.length == 0) {
        whereStatementsArray = [whereStatement];
    } else {
        for (var i = 0; i < campaignNameContains.length; i++) {
            whereStatementsArray.push(whereStatement + 'AND CampaignName CONTAINS_IGNORE_CASE "' + campaignNameContains[i].replace(/"/g, '\\\"') + '" ');
        }
    }

    for (var i = 0; i < whereStatementsArray.length; i++) {
        var campaignReport = AdWordsApp.report(
            "SELECT CampaignId " +
            "FROM   CAMPAIGN_PERFORMANCE_REPORT " +
            "WHERE  CampaignStatus = ENABLED " +
            whereStatementsArray[i] +
            "DURING LAST_30_DAYS");

        var rows = campaignReport.rows();
        while (rows.hasNext()) {
            var row = rows.next();
            campaignIds.push(row['CampaignId']);
        }
    }

    if (campaignIds.length == 0) {
        throw("No campaigns found with the given settings.");
    }

    Logger.log(campaignIds.length + " campaigns were found.");
    return campaignIds;
}
