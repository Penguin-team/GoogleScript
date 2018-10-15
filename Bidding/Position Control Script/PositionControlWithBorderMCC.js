/*
* Разработано специалистами агентства Penguin-team
* © 2018 Penguin-team, Ukraine
* https://pengstud.com/
*/

function main() {
    MccApp.accountLabels().withCondition("Name = 'p.c.a.a'").get().next().accounts().executeInParallel('func');
}

function func() {
    //Logger.log('Hello world');
    var campaigns = AdWordsApp.campaigns().withCondition("LabelNames CONTAINS_ANY ['p.c.c.a']").withCondition("CampaignStatus = ENABLED").get();
    while (campaigns.hasNext()) {
        var campaign = campaigns.next();
        var positionLabel = campaign.labels().withCondition("LabelName STARTS_WITH_IGNORE_CASE 'tcc'").get().next().getName();
        var position = parseFloat(positionLabel.replace(/[^\d.-]/g, ''));
        var bidBorderLabel = campaign.labels().withCondition("LabelName STARTS_WITH_IGNORE_CASE 'tcb'").get().next().getName();
        var bidBorder = parseFloat(bidBorderLabel.replace(/[^\d.-]/g, ''));
        var personalBidBorder = bidBorder * 0.2;
        raisePositionControl(campaign, bidBorder, position);
        lowerPositionControl(campaign, bidBorder, position);
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