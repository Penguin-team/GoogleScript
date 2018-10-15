/*
* Скрипт создан Алексеем Ярошенко.
* Скрипт адаптирован специалистами агентства Penguin-team
* © 2018 Penguin-team, Ukraine
* https://pengstud.com/
*
1) Поиск мест размещений идет по всему аккаунту. Эти исключения мест размещений автоматически добавляются в кампании, помеченные ярлыком "PlacementCleaner". Добавьте этот ярлык к кампаниям в КМС

2) Проверьте, подходят ли вам исключения. Добавьте или удалите ненужные. Можно добавить для исключения и доменную зону. Пример: '.kz'
*/

var exclude = ['gta', 'dota', 'minecraft', 'resheb', 'referat', 'igry', 'igra', 'igri', 'game', 'flash', 'apk', 'android', 'mp3', 'fb2', 'dating', 'goroskop', 'astro', 'film', 'video', 'movie', 'book', 'download', 'torrent', 'kino', 'radio', 'weather', 'pesni', 'chords', 'anekdot', 'zodiak', 'minusovk', 'knig', 'recept', 'recipe', 'spongebob', 'barbie', 'skyrim', 'ferma', 'dom2', 'mafia', 'gadani', 'mario', 'epub', '2048', 'dendy', 'sega', 'zuma', 'aforizm', 'citat', 'pdf', 'simulat', 'mods', 'play', 'spintires', 'spin-tires', 'girl', 'boy', 'news'];
/*
3) Выберите период учета статистики или очистите поле, чтобы обработать данные в аккаунте за весь период.

Возможные периоды:
    LAST_7_DAYS
    LAST_WEEK
    LAST_MONTH
    LAST_14_DAYS
    LAST_30_DAYS
    LAST_BUSINESS_WEEK
    THIS_WEEK_SUN_TODAY
    THIS_WEEK_MON_TODAY
    LAST_WEEK_SUN_SAT
    THIS_MONTH
*/

var period = 'LAST_MONTH';

function main() {
    var periodString = '';

    if (period) {
        periodString = "DURING " + period;
        Logger.log(periodString);
    } else {
        Logger.log('DURING ALL TIME');
    }
    var report = AdWordsApp.report("SELECT Domain, Clicks, Conversions " +
        "FROM AUTOMATIC_PLACEMENTS_PERFORMANCE_REPORT " +
        periodString);

    var rows = report.rows();
    var excludePlacementArray = [];

    while (rows.hasNext()) {
        var row = rows.next();
        var placement = row['Domain'];
        if (containsAny(placement.toString(), exclude) && (row['Conversions'] < 1)) {
            excludePlacementArray[excludePlacementArray.length] = placement.toString();
        }

    }

    addNegativeKeywordToCampaign(excludePlacementArray);

}

function containsAny(str, substrings) {
    for (var i = 0; i != substrings.length; i++) {
        var substring = substrings[i];
        if ((str.indexOf(substring) != -1) && (str.indexOf('mobileapp::') == -1)) {
            return substring;
        }
    }
    return null;
}

function addNegativeKeywordToCampaign(negativePlacements) {
    var campaignIterator = AdWordsApp.campaigns().withCondition("LabelNames CONTAINS_ANY ['PlacementCleaner']").get();
    while (campaignIterator.hasNext()) {
        var campaign = campaignIterator.next();

        negativePlacements.forEach(function (entry) {
            excludePlacement = campaign.display().newPlacementBuilder();
            excludePlacement.withUrl(entry.toString()).exclude();
            Logger.log(entry.toString() + ' - Excluded');
        });
    }
}