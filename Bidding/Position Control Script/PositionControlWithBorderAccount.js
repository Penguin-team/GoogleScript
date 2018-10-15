/* 
* Разработано специалистами агентства Penguin-team
* © 2018 Penguin-team, Ukraine
* https://pengstud.com/
*/
function main() {
    /* главная функция запуска */
    func();
}

function func() {
    /* выбираем все включенные кампании с меткой p.c.c.a */
    var campaigns = AdWordsApp.campaigns().withCondition("LabelNames CONTAINS_ANY ['p.c.c.a']").withCondition("CampaignStatus = ENABLED").get();

    /* пока есть кампании, работаем */
    while (campaigns.hasNext()) {
        var campaign = campaigns.next();
        /* берем метку, которая начинается с фразы tcc */
        var positionLabel = campaign.labels().withCondition("LabelName STARTS_WITH_IGNORE_CASE 'tcc'").get().next().getName();
        /* получаем из названия метки значение желаемой позиции , например tcc1.5 => 1.5 */
        var position = parseFloat(positionLabel.replace(/[^\d.-]/g, ''));
        /* берем метку, которая начинается с фразы tcb */
        var bidBorderLabel = campaign.labels().withCondition("LabelName STARTS_WITH_IGNORE_CASE 'tcb'").get().next().getName();
        /* получаем из названия метки значение денег , например tcb10 => 110 */
        var bidBorder = parseFloat(bidBorderLabel.replace(/[^\d.-]/g, ''));
        
        var personalBidBorder = bidBorder * 0.2;
        /* скрипт для повышения позиции */
        raisePositionControl(campaign, bidBorder, position);
        /* скрипт для понижения позиции */
        lowerPositionControl(campaign, bidBorder, position);
        /* скрипт для изменения ставки */
        funcAddBids(campaign, bidBorder, personalBidBorder);
    }
}

function raisePositionControl(campaign, bidBorder, position) {
    
    var keywords = AdWordsApp.keywords().withCondition("Status = ENABLED").withCondition("CampaignName = '" + campaign.getName() + "'")
        .withCondition("Impressions > 0")
        .withCondition("AveragePosition > " + position)
        .orderBy("AveragePosition ASC")
        .forDateRange("YESTERDAY").get();

    
    while (keywords.hasNext()) {
        var keyword = keywords.next();
        
        var stats = keyword.getStatsFor('YESTERDAY');


        var positionCoef = 0.1;
        var positionDiff = position/stats.getAveragePosition();
        if (positionDiff >= 0.9) {
            positionCoef = 0.01;
        }

        
        var statsto = position / stats.getAveragePosition();

        
        statsto = 1 - statsto.toFixed(2) - positionCoef;

        
        if (statsto > 0 && stats.getAveragePosition() > 0) {
            statsto = keyword.getMaxCpc() + keyword.getMaxCpc() * statsto;
            if (statsto <= bidBorder) {
                keyword.setMaxCpc(statsto);
            } else {
                keyword.setMaxCpc(bidBorder);
            }
        }
    }
}


function lowerPositionControl(campaign, bidBorder, position) {
    
    var keywords = AdWordsApp.keywords().withCondition("Status = ENABLED").withCondition("CampaignName = '" + campaign.getName() + "'")
        .withCondition("Impressions > 0")
        .withCondition("AveragePosition < " + position)
        .orderBy("AveragePosition ASC")
        .forDateRange("YESTERDAY").get();
    
    while (keywords.hasNext()) {
        var keyword = keywords.next();
        
        var stats = keyword.getStatsFor('YESTERDAY');

        var positionCoef = 0.1;
        var positionDiff = stats.getAveragePosition()/position;
        if (positionDiff >= 0.9) {
            positionCoef = 0.01;
        }

        
        var statsto = stats.getAveragePosition() / position;
        
        statsto = 1 - statsto.toFixed(2) - positionCoef;
        if (statsto > 0 && stats.getAveragePosition() > 0) {
            statsto = keyword.getMaxCpc() - keyword.getMaxCpc() * statsto;
            if (statsto <= bidBorder) {
                keyword.setMaxCpc(statsto);
            } else {
                keyword.setMaxCpc(bidBorder);
            }
        }
    }
}


function funcAddBids(campaign, bidBorder, personalBidBorder) {
    
    var keywords = AdWordsApp.keywords()
        .withCondition("Status = ENABLED")
        .withCondition("AdGroupStatus = ENABLED")
        .withCondition("CampaignName = '" + campaign.getName() + "'")
        .withCondition("Impressions = 0")
        .forDateRange("LAST_7_DAYS")
        .get();
    
    while (keywords.hasNext()) {
        var keyword = keywords.next();
        var topCpcKeyword = keyword.getTopOfPageCpc();
        var firstCpcKeyword = keyword.getFirstPageCpc();
        var nowCpcKeyword = keyword.getMaxCpc();
        if (topCpcKeyword !== null) {
            bidCreatorTop(bidBorder, personalBidBorder, keyword, topCpcKeyword, firstCpcKeyword, nowCpcKeyword);
        } else {
            bidCreatorFirst(bidBorder, personalBidBorder, keyword, topCpcKeyword, firstCpcKeyword, nowCpcKeyword);
        }
    }
}

function bidCreatorTop(bidBorder, personalBidBorder, keyword, topCpcKeyword, firstCpcKeyword, nowCpcKeyword) {
    if (bidBorder > topCpcKeyword && personalBidBorder <= topCpcKeyword && nowCpcKeyword < topCpcKeyword) {
        keyword.setMaxCpc(topCpcKeyword);
    } else if (bidBorder <= topCpcKeyword && nowCpcKeyword < topCpcKeyword && nowCpcKeyword < bidBorder) {
        keyword.setMaxCpc(bidBorder);
    }
}

function bidCreatorFirst(bidBorder, personalBidBorder, keyword, topCpcKeyword, firstCpcKeyword, nowCpcKeyword) {
    if (bidBorder > firstCpcKeyword && personalBidBorder <= firstCpcKeyword && nowCpcKeyword < firstCpcKeyword) {
        keyword.setMaxCpc(firstCpcKeyword);
    } else if (bidBorder <= firstCpcKeyword && nowCpcKeyword < firstCpcKeyword && nowCpcKeyword < bidBorder) {
        keyword.setMaxCpc(bidBorder);
    }
}