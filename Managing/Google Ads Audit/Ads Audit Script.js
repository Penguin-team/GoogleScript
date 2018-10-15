/************************************
 * AdWords Account Audit Checklist
 * Adapted from script by: Russ Savage on FreeAdWordsScripts.com
 * Скрипт адаптирован специалистами агентства Penguin-team
 * © 2018 Penguin-team, Ukraine
 * https://pengstud.com/


 ************************************/
var REPORTS_FOLDER_PATH = 'Google Ads Audit Script';

function main() {
    var adWordsAccount = AdWordsApp.currentAccount();
    var reportsFolder = getFolder(REPORTS_FOLDER_PATH);
    var spreadsheet = getReportSpreadsheet(reportsFolder, adWordsAccount);
    var sheet = getSheetByName(spreadsheet, 'test');

    var results = [];


    results.push(getTotals());

    //1. Кампании
    //  a. Ниже нужно указать целевые регионы показа рекламы
    //var includedLocList = ['Kiev']; // <-- список целевых регионов
    //results.push("Included Location Check List: " + includedLocList);
    //results.push(verifyTargetedLocations(includedLocList));

    //var excludedLocList = ['Dnipro']; // <-- список регионов, которые нужно исключить
    //results.push("Ecluded Location check List: " + excludedLocList);
    //results.push(verifyExcludedLocations(excludedLocList));


    //  b. Язык пока нельзя проверить с помощью этого скрипта
    //  c. Search vs Display
    results.push("All Statistics are for last 30 Days");
    results.push(verifySearchAndDisplay());

    //  d. Проверка модификаторов мобильных девайсов
    results.push(verifyMobileModifiers());

    //2. AdGroups
    //  a. Проверка групп в которых больше "n" слов
    var ADGROUP_SIZE = 3; // <-- проверка кол-во ключей в группе
    results.push(verifyAdGroupSize(ADGROUP_SIZE));

    //  c. Проверка объявлений
    var NUMBER_OF_ADS = 2; // <-- проверка кол-ва объявлений в группе
    results.push(verifyAdGroupNumberOfAds(NUMBER_OF_ADS));

    //3. Ключевые слова
    //  a. Проверка типов соответствия
    results.push(printMatchTypes());

    //4. Поисковые запросы


    //5. Другое
    //  a. Отслеживание конверсий
    results.push(verifyConversionTracking());

    //  b. Расширения
    results.push(verifyAdExtensions());

    // c. Кампании без корректировки по времени
    results.push(verifyTimeModifiers());

    // d. Проверка кампаний без аудиторий
    results.push(verifyAudienceModifiers());

    //e. Проверка ссылок
    results.push(verifyURL());

    //f: Затраты на рекламу вне целевой локации
    results.push("Spend INSIDE target location: " + spendLocation("true"));
    results.push("Spend OUTSIDE target location: " + spendLocation("false"));

    results.push("*NOTE: Only campaign level extensions have been checked, account level extensions should be checked manually");
    results.push("*NOTE: Demographic audiences should be checked manually");

    info(results);

    exportToSpreadsheet(results, sheet);

    Logger.log(reportsFolder.getUrl());
}

function getTotals() {
    var TOTAL_CAMPAIGNS = AdWordsApp.campaigns().withCondition('Status = ENABLED').get().totalNumEntities();
    var TOTAL_ADGROUPS = AdWordsApp.adGroups().withCondition('Status = ENABLED').withCondition('CampaignStatus = ENABLED').get().totalNumEntities();

    return "TOTAL # of active campaigns: " + TOTAL_CAMPAIGNS + "\n" +
        "TOTAL # of active ad groups: " + TOTAL_ADGROUPS
}

function verifyConversionTracking() {

    var noCamps = 0;
    // Если в аккаунте за последние 7 дней не было конверсий, что то идет не так.
    var campsWithConversions = AdWordsApp.campaigns()
        .withCondition('Status = ENABLED')
        .forDateRange('LAST_7_DAYS')
        .withCondition('Conversions > 0')
        .get().totalNumEntities();
    if (campsWithConversions == 0) {
        //warn('В аккаунте возможно не настроены конверсии.');
        noCamps++;
    }
    return "Campaigns with no conversions: " + noCamps;
}

function verifyAdExtensions() {

    var noCampsLinks = 0;
    var noCampsPhone = 0;
    var noCampsMobile = 0;
    var noCampsCallout = 0;
    var noCampsSnippet = 0;

    var campIter = AdWordsApp.campaigns().withCondition('Status = ENABLED').get();
    while (campIter.hasNext()) {
        var camp = campIter.next();
        var phoneNumExtCount = camp.extensions().phoneNumbers().get().totalNumEntities();
        if (phoneNumExtCount == 0) {
            //warn('Campaign: "'+camp.getName()+'" is missing phone number extensions.');
            noCampsPhone++;
        }
        var siteLinksExtCount = camp.extensions().sitelinks().get().totalNumEntities();
        if (siteLinksExtCount == 0) {
            //warn('Campaign: "'+camp.getName()+'" could use more site links. Currently has: '+siteLinksExtCount);
            noCampsLinks++;
        }

        var mobileAppsExtCount = camp.extensions().mobileApps().get().totalNumEntities();
        if (mobileAppsExtCount == 0) {
            // warn('Campaign: "'+camp.getName()+'" is missing mobile apps extension.');
            noCampsMobile++;
        }

        var calloutExtCount = camp.extensions().callouts().get().totalNumEntities();
        if (calloutExtCount == 0) {
            noCampsCallout++;
        }

        var snippetExtCount = camp.extensions().snippets().get().totalNumEntities();
        if (snippetExtCount == 0) {
            noCampsSnippet++;
        }
    }
    return 'Campaigns without extensions:' + '\n' +
        '\tCampaigns Missing Phone Ext: ' + noCampsPhone + '\n' +
        '\tCampaigns Missing Sitelinks: ' + noCampsLinks + '\n' +
        '\tCampaigns Missing Callout: ' + noCampsCallout + '\n' +
        '\tCampaigns Missing Snippets Ext: ' + noCampsSnippet + '\n' +
        '\tCampaigns Missing Mobile App: ' + noCampsMobile;
}


function spendLocation(param) {
    var cost = 0.0;
    var country = "";
    var report = AdWordsApp.report(
        "SELECT CountryCriteriaId, Clicks, Cost, Impressions " +
        "FROM   GEO_PERFORMANCE_REPORT " +
        "WHERE  LocationType = LOCATION_OF_PRESENCE AND IsTargetingLocation IN [" + param + "]" +
        " DURING LAST_30_DAYS");

    var rows = report.rows();

    while (rows.hasNext()) {
        var row = rows.next();
        //info (row["Cost"]);
        //info (row["CountryCriteriaId"]);
        country = country + row["CountryCriteriaId"] + ", ";
        cost = +cleanAndParseFloat(row["Cost"]);
    }

    return country + cost;
}


function printMatchTypes() {
    var numBroad = AdWordsApp.keywords()
        .withCondition('Status = ENABLED')
        .withCondition('AdGroupStatus = ENABLED')
        .withCondition('CampaignStatus = ENABLED')
        .withCondition('KeywordMatchType = BROAD')
        .get().totalNumEntities();
    var numPhrase = AdWordsApp.keywords()
        .withCondition('Status = ENABLED')
        .withCondition('AdGroupStatus = ENABLED')
        .withCondition('CampaignStatus = ENABLED')
        .withCondition('KeywordMatchType = PHRASE')
        .get().totalNumEntities();
    var numExact = AdWordsApp.keywords()
        .withCondition('Status = ENABLED')
        .withCondition('AdGroupStatus = ENABLED')
        .withCondition('CampaignStatus = ENABLED')
        .withCondition('KeywordMatchType = EXACT')
        .get().totalNumEntities();
    var total = numBroad + numPhrase + numExact;
    var percBroad = Math.round(numBroad / total * 100);
    var percPhrase = Math.round(numPhrase / total * 100);
    var percExact = Math.round(numExact / total * 100);


    return 'Out of a total of: ' + total + ' active keywords in your account:' + '\n' +
        '\tBroad: ' + numBroad + ' or ' + percBroad + '%' + '\n' +
        '\tPhrase: ' + numPhrase + ' or ' + percPhrase + '%' + '\n' +
        '\tExact: ' + numExact + ' or ' + percExact + '%';
}

function verifyAdGroupNumberOfAds(requiredNumberOfAds) {

    var adGroupCountMax = 0;
    var adGroupCountMin = 0;
    var agIter = AdWordsApp.adGroups()
        .withCondition('Status = ENABLED')
        .withCondition('CampaignStatus = ENABLED')
        .get();
    while (agIter.hasNext()) {
        var ag = agIter.next();
        var adCount = ag.ads().withCondition('Status = ENABLED').get().totalNumEntities();
        if (adCount < requiredNumberOfAds) {
            //warn('Campaign: "'+ag.getCampaign().getName()+'" AdGroup: "'+ag.getName()+'" does not have enough ads: '+adCount);
            adGroupCountMin++;
        }
        if (adCount > (requiredNumberOfAds + 2)) {
            //warn('Campaign: "'+ag.getCampaign().getName()+'" AdGroup: "'+ag.getName()+'" has too many ads: '+adCount);
            adGroupCountMax++;
        }
    }
    return "Ad Count in AdGroups:" + '\n' +
        "\tAdGroups with more than 3 ads: " + adGroupCountMax + '\n' +
        "\tAdGroups with less than 3 ads: " + adGroupCountMin;
}

function verifyAdGroupSize(size) {

    var adGroupCountMax = 0;
    var agIter = AdWordsApp.adGroups()
        .withCondition('Status = ENABLED')
        .withCondition('CampaignStatus = ENABLED')
        .get();
    while (agIter.hasNext()) {
        var ag = agIter.next();
        var kwSize = ag.keywords().withCondition('Status = ENABLED').get().totalNumEntities();
        if (kwSize >= size) {
            //warn('Campaign: "'+ag.getCampaign().getName()+'" AdGroup: "'+ag.getName()+'" has too many keywords: '+kwSize);
            adGroupCountMax++;
        }
    }
    return "AdGroups with more then 25 keywords: " + adGroupCountMax;
}

function verifyMobileModifiers() {
    var campCount = 0;
    var campDesktopCount = 0;
    var campTabletCount = 0;
    var campIter = AdWordsApp.campaigns().withCondition('Status = ENABLED').get();
    while (campIter.hasNext()) {
        var camp = campIter.next();
        var desktop = camp.targeting().platforms().desktop().get().next();
        var tablet = camp.targeting().platforms().tablet().get().next();
        var mobile = camp.targeting().platforms().mobile().get().next();
        //check for mobile modifiers
        if (desktop.getBidModifier() == 1) {
            campDesktopCount++;
        }

        if (tablet.getBidModifier() == 1) {
            campTabletCount++;
        }

        if (mobile.getBidModifier() == 1) {
            campCount++;
        }
    }
    return "Device Modifiers:" + '\n' +
        "\tCampaigns with no mobile bid modifiers: " + campCount + '\n' +
        "\tCampaigns with no desktop bid modifiers: " + campDesktopCount + '\n' +
        "\tCampaigns with no tablet bid modifiers: " + campTabletCount;
}

function verifyTimeModifiers() {
    var campCount = 0;
    var campIter = AdWordsApp.campaigns().withCondition('Status = ENABLED').get();
    while (campIter.hasNext()) {
        var camp = campIter.next();
        var adScheduleIterator = camp.targeting().adSchedules().get();

        if (adScheduleIterator.totalNumEntities() == 0) {
            campCount++;
        }

    }
    return "Campaigns with no Time Scheduling Bid Modifiers: " + campCount;
}


function verifyAudienceModifiers() {
    var campCount = 0;
    var campIter = AdWordsApp.campaigns().withCondition('Status = ENABLED').get();
    while (campIter.hasNext()) {
        var camp = campIter.next();
        var audienceIterator = camp.targeting().audiences().get();

        //info(camp.getName() + " "+ audienceIterator.totalNumEntities());

        if (audienceIterator.totalNumEntities() == 0) {
            campCount++;
        }

    }
    return "Campaigns with no Audience Bid Modifiers: " + campCount;
}


function verifyURL() {
    var validCodes = [200, 301, 302];
    //Use commas to seperate recipients
    //var email_recipients = "userA@example.com, userB@example.com"

    var urls = [];
    var badUrls = [];

    var keywordIterator = AdWordsApp.ads()
        .withCondition("Status = ENABLED")
        .withCondition("AdGroupStatus = ENABLED")
        .withCondition("CampaignStatus = ENABLED")
        .get();
    while (keywordIterator.hasNext()) {
        var keyword = keywordIterator.next();
        var destinationUrl = keyword.getDestinationUrl();
        if (destinationUrl !== null && destinationUrl !== "") {
            var url = destinationUrl.split('?')[0];
            if (urls.indexOf(url) === -1) {
                urls.push(url);
            }
        }
    }

    var urlFetchOptions = {muteHttpExceptions: true};


    for (var x = 0; x < urls.length; x++) {
        try {
            var response = UrlFetchApp.fetch(urls[x], urlFetchOptions);
            var code = response.getResponseCode();
        }
        catch (err) {
            Logger.log("The Url " + urls[x] + " could not be processed");
        }
        if (validCodes.indexOf(code) === -1) {
            badUrls.push(urls[x]);
            Logger.log(urls[x]);
        }
    }

    if (badUrls.length !== 0) {

        var accountName = AdWordsApp.currentAccount().getName();


        return "The following are broken URLs in the account " + accountName + ". \n" + badUrls.join("\n");

    }
    return "No Broken URLs Found";
}


function verifyTargetedLocations(locList) {
    var campArray = [0, 0];
    var campTemp = [0, 0];
    var campIter = AdWordsApp.campaigns().withCondition('Status = ENABLED').get();
    while (campIter.hasNext()) {
        var camp = campIter.next();
        var locIter = camp.targeting().targetedLocations().get();
        campTemp = reportOnLocations(camp, locIter, locList);
        campArray[0] += campTemp[0]
        campArray[1] += campTemp[1]
    }
    return "Location Targeting:" + '\n' +
        "\tCampaigns with incorrect Location targeting: " + campArray[0] + '\n' +
        "\tCampaigns with missing Location targeting: " + campArray[1];
}

function verifyExcludedLocations(locList) {
    var campArray = [0, 0];
    var campTemp = [0, 0];
    var campIter = AdWordsApp.campaigns().withCondition('Status = ENABLED').get();
    while (campIter.hasNext()) {
        var camp = campIter.next();
        var locIter = camp.targeting().excludedLocations().get();
        campTemp = reportOnLocations(camp, locIter, locList);
        campArray[0] += campTemp[0]
        campArray[1] += campTemp[1]
    }
    return "Excluded Location Targeting:" + '\n' +
        "\tCampaigns with incorrect exluded loc. targeting: " + campArray[0] + '\n' +
        "\tCampaigns with missing excluded loc. targeting: " + campArray[1];
}

function reportOnLocations(camp, locIter, locList) {
    var campCountIncorect = 0;
    var campCountNot = 0;
    var campLocList = [];
    while (locIter.hasNext()) {
        var loc = locIter.next();
        campLocList.push(loc.getName());
        if (!locList) {
            //warn('Campaign: "'+camp.getName()+'" targeting: "'+loc.getName()+'"');
        }
    }
    if (locList && campLocList.sort() != locList.sort()) {
        for (var i in campLocList) {
            if (locList.indexOf(campLocList[i]) == -1) {
                //warn('Campaign: "'+camp.getName()+'" incorrectly targeting: "'+campLocList[i]+'"');
                campCountIncorect = 1;
            }
        }
        for (var i in locList) {
            if (campLocList.indexOf(locList[i]) == -1) {
                //warn('Campaign: "'+camp.getName()+'" not targeting: "'+locList[i]+'"');
                campCountNot = 1;
            }
        }
    }
    return [campCountIncorect, campCountNot]
}

function verifySearchAndDisplay() {
    var campCount = 0;
    var campNames = '';
    var API_VERSION = {includeZeroImpressions: false};
    var cols = ['CampaignId', 'CampaignName', 'AdNetworkType1', 'Impressions'];
    var report = 'CAMPAIGN_PERFORMANCE_REPORT';
    var query = ['select', cols.join(','), 'from', report, 'during', 'LAST_30_DAYS'].join(' ');
    var results = {}; // { campId : { agId : [ row, ... ], ... }, ... }
    var reportIter = AdWordsApp.report(query, API_VERSION).rows();
    while (reportIter.hasNext()) {
        var row = reportIter.next();
        if (results[row.CampaignId]) {
            // warn('Campaign: "'+row.CampaignName+'" is targeting the Display and Search networks.');
            campNames = campNames + ' ' + row.CampaignName
            campCount++;
        } else {
            results[row.CampaignId] = row;
        }
    }
    //return results;
    return "Campaigns targeting 'Display and Search': " + campCount + " And the names: " + campNames
}

function warn(msg) {
    Logger.log('WARNING: ' + msg);
}

function info(msg) {
    Logger.log(msg);
}

/* ******************************************* */
function cleanAndParseFloat(valueStr) {
    valueStr = cleanValueStr(valueStr);
    return parseFloat(valueStr);
}

function cleanAndParseInt(valueStr) {
    valueStr = cleanValueStr(valueStr);
    return parseInt(valueStr);
}

function cleanValueStr(valueStr) {
    valueStr = valueStr.toString();
    if (valueStr.charAt(valueStr.length - 1) == '%') {
        valueStr = valueStr.substring(0, valueStr.length - 1);
    }
    valueStr = valueStr.replace(/,/g, '');
    return valueStr;
}

/*
 * Gets the worksheet from the given spreadsheet and workshee-name.
 * Creates new worksheet if doesn't exist.
 */
function getSheetByName(spreadsheet, newSheetName) {
    var sheet = spreadsheet.getSheetByName(newSheetName);
    if (sheet != null) {
        sheet.clear();
    } else {
        sheet = spreadsheet.insertSheet(newSheetName, 0);
    }
    return sheet;
}


/*
 * Saves the report data
 */
function exportToSpreadsheet(data, sheet) {

    var tableHeaderRowPos = 4;
    var rowIdx = tableHeaderRowPos;

    for (var idx = 0; idx < data.length; idx++) {
        var expt = [data[idx]];
        info(idx + ' ' + expt);

        sheet.getRange(rowIdx + idx, 1).setValues([expt]);
    }


}

/*
 * Gets the report file (spreadsheet) for the given Adwords account in the given folder.
 * Creates a new spreadsheet if doesn't exist.
 */


function getReportSpreadsheet(folder, adWordsAccount) {
    var accountId = adWordsAccount.getCustomerId();
    var accountName = adWordsAccount.getName();
    var spreadsheet = undefined;
    var files = folder.searchFiles(
        'mimeType = "application/vnd.google-apps.spreadsheet" and title contains "' + accountId + '"');
    if (files.hasNext()) {
        var file = files.next();
        spreadsheet = SpreadsheetApp.open(file);
    }

    if (!spreadsheet) {
        var fileName = accountName + " (" + accountId + ")";
        spreadsheet = SpreadsheetApp.create(fileName);
        var file = DriveApp.getFileById(spreadsheet.getId());
        var oldFolder = file.getParents().next();
        folder.addFile(file);
        oldFolder.removeFile(file);
    }
    return spreadsheet;
}

/*
* Gets the folder in Google Drive for the given folderPath.  
* Creates the folder and all the intermediate folders if needed.
*/
function getFolder(folderPath) {
    var folder = DriveApp.getRootFolder();
    var folderNamesArray = folderPath.split("/");
    for (var idx = 0; idx < folderNamesArray.length; idx++) {
        var newFolderName = folderNamesArray[idx];
        // Skip if new folder name is empty (possibly due to slash at the end)
        if (newFolderName.trim() == "") {
            continue;
        }
        var folderIterator = folder.getFoldersByName(newFolderName);
        if (folderIterator.hasNext()) {
            folder = folderIterator.next();
        } else {
            Logger.log("Creating folder '" + newFolderName + "'");
            folder = folder.createFolder(newFolderName);
        }
    }
    return folder;
}