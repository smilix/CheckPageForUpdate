var FeedParser = require('feedparser');
var request = require('request');
var crypto = require('crypto');
var Q = require("q");

var config = require('./config.js');
var stateHolder = require('./state.js');

var DEBUG = false;

if (config.pages.length === 0) {
  console.log('No pages configured!');
  return;
}

stateHolder.load();

var changedFeeds = [];

var checkFeedPromises = config.pages.map(function (page) {
  return checkFeed(page);
});


Q.all(checkFeedPromises)
  .then(function () {
    stateHolder.save();

    if (changedFeeds.length === 0) {
      debugLog('No changed feeds!');
      return;
    }

    console.log('There are new feeds!\n');
    changedFeeds.forEach(function (item) {
      printNewFeed(item);
    })

  })
  .catch(function (error) {
    console.error('Error occurred!', error);
  })
  .done();


function printNewFeed(changedItem) {


  var descriptionPreview = changedItem.newItem.description || '- no description -';
  descriptionPreview = stripHtmlTags(descriptionPreview);
  descriptionPreview = trimString(descriptionPreview, config.descriptionPreviewLength);

  var linkToArticle = changedItem.newItem.link || changedItem.page.htmlUrl;

  console.log('%s: %s\n[%s]\n%s\n',
    changedItem.page.id,
    changedItem.newItem.title,
    descriptionPreview,
    linkToArticle);
}

/**
 * Tries to remove all html tags, but preserve the content. s
 * @param str
 * @returns {string}
 */
function stripHtmlTags(str) {
  return str.replace(/<(?:.|\n)*?>/gm, '');
}

/**
 * Trims the given string to maxLength. If the string is trimmed, it ends with '...'.
 * @param str
 * @param maxLength
 * @returns {string}
 */
function trimString(str, maxLength) {
  if (!str) {
    return '';
  }
  var trimSuffix = '...';
  if (str.length < ( maxLength - trimSuffix.length)) {
    return str;
  }
  return str.substr(0, maxLength - trimSuffix.length) + trimSuffix;
}

function checkFeed(page) {
  var deferred = Q.defer();

  var newestFeed;

  debugLog('Start checking page: ', page.id);
  request(page.feedUrl)
    .on('error', function (error) {
      deferred.reject(new Error('Can´t get the url for page ´' + page.id + '´, because: ' + (error.msg || error)));
    })
    .pipe(new FeedParser({}))
    .on('error', function (error) {
      console.error('feed error: ', error);
      deferred.reject(new Error('Can´t parse the feed for page ´' + page.id + '´, because: ' + (error.msg || error)));
    })
    .on('readable', function () {
      var stream = this, item;
      while (item = stream.read()) {
        if (!newestFeed || newestFeed.date <= item.date) {
          newestFeed = item;
        }
      }
    })
    .on('end', function () {
      if (!newestFeed) {
        console.info('No feeds found for ' + page.id);
        deferred.resolve();
        return;
      }

      var lastState = stateHolder.state[page.id];
      var state = createFeedState(newestFeed);

      if (!lastState || lastState.hash !== state.hash) {
        stateHolder.state[page.id] = state;

        changedFeeds.push({
          page: page,
          newItem: newestFeed
        });
      }

      deferred.resolve();
    });

  return deferred.promise;
}

function createFeedState(feedItem) {
  var title = feedItem.title || '-no-title-';
  var description = feedItem.description || '-no-desc-';

  var shasum = crypto.createHash('sha1');
  shasum.update(title, 'utf8');
  shasum.update(description, 'utf8');

  return {
    title: title,
    hash: shasum.digest('hex')
  }
}

function debugLog(/* arguments */) {
  if (DEBUG) {
    console.log.apply(this, arguments);
  }
}




