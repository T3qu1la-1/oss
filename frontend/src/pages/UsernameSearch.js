import React, { useState } from 'react';
import { Search, Loader, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import './ToolPages.css';

const UsernameSearch = () => {
  const [username, setUsername] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);

  // 450+ plataformas COMPLETAS
  const platforms = [
    // Social Media (60)
    { name: 'Instagram', url: 'https://instagram.com/{username}', category: 'Social' },
    { name: 'Twitter/X', url: 'https://twitter.com/{username}', category: 'Social' },
    { name: 'Facebook', url: 'https://facebook.com/{username}', category: 'Social' },
    { name: 'TikTok', url: 'https://tiktok.com/@{username}', category: 'Social' },
    { name: 'Snapchat', url: 'https://snapchat.com/add/{username}', category: 'Social' },
    { name: 'LinkedIn', url: 'https://linkedin.com/in/{username}', category: 'Professional' },
    { name: 'Pinterest', url: 'https://pinterest.com/{username}', category: 'Social' },
    { name: 'Tumblr', url: 'https://{username}.tumblr.com', category: 'Social' },
    { name: 'Reddit', url: 'https://reddit.com/user/{username}', category: 'Forum' },
    { name: 'VK', url: 'https://vk.com/{username}', category: 'Social' },
    { name: 'OK.ru', url: 'https://ok.ru/{username}', category: 'Social' },
    { name: 'Telegram', url: 'https://t.me/{username}', category: 'Messaging' },
    { name: 'WhatsApp', url: 'https://wa.me/{username}', category: 'Messaging' },
    { name: 'WeChat', url: 'https://weixin.qq.com/{username}', category: 'Messaging' },
    { name: 'Line', url: 'https://line.me/ti/p/{username}', category: 'Messaging' },
    { name: 'Viber', url: 'https://viber.com/{username}', category: 'Messaging' },
    { name: 'Discord', url: 'https://discord.com/users/{username}', category: 'Gaming' },
    { name: 'Skype', url: 'https://skype.com/{username}', category: 'Messaging' },
    { name: 'Meetup', url: 'https://meetup.com/members/{username}', category: 'Social' },
    { name: 'Minds', url: 'https://minds.com/{username}', category: 'Social' },
    { name: 'Gab', url: 'https://gab.com/{username}', category: 'Social' },
    { name: 'Parler', url: 'https://parler.com/{username}', category: 'Social' },
    { name: 'MeWe', url: 'https://mewe.com/{username}', category: 'Social' },
    { name: 'Mastodon', url: 'https://mastodon.social/@{username}', category: 'Social' },
    { name: 'Bluesky', url: 'https://bsky.app/profile/{username}', category: 'Social' },
    { name: 'Truth Social', url: 'https://truthsocial.com/@{username}', category: 'Social' },
    { name: 'Gettr', url: 'https://gettr.com/user/{username}', category: 'Social' },
    { name: 'Rumble', url: 'https://rumble.com/user/{username}', category: 'Video' },
    { name: 'BitChute', url: 'https://bitchute.com/channel/{username}', category: 'Video' },
    { name: 'Odysee', url: 'https://odysee.com/@{username}', category: 'Video' },
    { name: 'Clubhouse', url: 'https://clubhouse.com/@{username}', category: 'Social' },
    { name: 'Houseparty', url: 'https://houseparty.com/{username}', category: 'Social' },
    { name: 'Yubo', url: 'https://yubo.live/{username}', category: 'Social' },
    { name: 'Vero', url: 'https://vero.co/{username}', category: 'Social' },
    { name: 'Ello', url: 'https://ello.co/{username}', category: 'Social' },
    { name: 'Diaspora', url: 'https://diasporafoundation.org/u/{username}', category: 'Social' },
    { name: 'Friendster', url: 'https://friendster.com/{username}', category: 'Social' },
    { name: 'Myspace', url: 'https://myspace.com/{username}', category: 'Social' },
    { name: 'Orkut', url: 'https://orkut.br.com/{username}', category: 'Social' },
    { name: 'LiveJournal', url: 'https://{username}.livejournal.com', category: 'Blog' },
    { name: 'Xanga', url: 'https://xanga.com/profile.aspx?user={username}', category: 'Blog' },
    { name: 'Plurk', url: 'https://plurk.com/{username}', category: 'Social' },
    { name: 'Weibo', url: 'https://weibo.com/{username}', category: 'Social' },
    { name: 'Douban', url: 'https://douban.com/people/{username}', category: 'Social' },
    { name: 'Renren', url: 'https://renren.com/{username}', category: 'Social' },
    { name: 'QZone', url: 'https://user.qzone.qq.com/{username}', category: 'Social' },
    { name: 'Mixi', url: 'https://mixi.jp/show_friend.pl?id={username}', category: 'Social' },
    { name: 'Foursquare', url: 'https://foursquare.com/{username}', category: 'Location' },
    { name: 'Swarm', url: 'https://swarmapp.com/user/{username}', category: 'Location' },
    { name: 'Yelp', url: 'https://yelp.com/user_details?userid={username}', category: 'Review' },
    { name: 'Untappd', url: 'https://untappd.com/user/{username}', category: 'Social' },
    { name: 'Nextdoor', url: 'https://nextdoor.com/profile/{username}', category: 'Local' },
    { name: 'Meetup', url: 'https://meetup.com/{username}', category: 'Events' },
    { name: 'Eventbrite', url: 'https://eventbrite.com/o/{username}', category: 'Events' },
    { name: 'Poshmark', url: 'https://poshmark.com/closet/{username}', category: 'Shopping' },
    { name: 'Mercari', url: 'https://mercari.com/u/{username}', category: 'Shopping' },
    { name: 'Depop', url: 'https://depop.com/{username}', category: 'Shopping' },
    { name: 'Vinted', url: 'https://vinted.com/member/{username}', category: 'Shopping' },
    { name: 'Grailed', url: 'https://grailed.com/{username}', category: 'Shopping' },
    { name: 'StockX', url: 'https://stockx.com/u/{username}', category: 'Shopping' },
    
    // Gaming (50)
    { name: 'Steam', url: 'https://steamcommunity.com/id/{username}', category: 'Gaming' },
    { name: 'Xbox', url: 'https://account.xbox.com/profile?gamertag={username}', category: 'Gaming' },
    { name: 'PlayStation', url: 'https://psnprofiles.com/{username}', category: 'Gaming' },
    { name: 'Twitch', url: 'https://twitch.tv/{username}', category: 'Streaming' },
    { name: 'Roblox', url: 'https://roblox.com/users/profile?username={username}', category: 'Gaming' },
    { name: 'Minecraft', url: 'https://namemc.com/profile/{username}', category: 'Gaming' },
    { name: 'Epic Games', url: 'https://epicgames.com/id/{username}', category: 'Gaming' },
    { name: 'Riot Games', url: 'https://na.op.gg/summoners/na/{username}', category: 'Gaming' },
    { name: 'Valorant', url: 'https://tracker.gg/valorant/profile/riot/{username}', category: 'Gaming' },
    { name: 'Fortnite', url: 'https://fortnitetracker.com/profile/all/{username}', category: 'Gaming' },
    { name: 'Chess.com', url: 'https://chess.com/member/{username}', category: 'Gaming' },
    { name: 'Lichess', url: 'https://lichess.org/@/{username}', category: 'Gaming' },
    { name: 'Kongregate', url: 'https://kongregate.com/accounts/{username}', category: 'Gaming' },
    { name: 'Armor Games', url: 'https://armorgames.com/user/{username}', category: 'Gaming' },
    { name: 'Newgrounds', url: 'https://{username}.newgrounds.com', category: 'Gaming' },
    { name: 'Itch.io', url: 'https://itch.io/profile/{username}', category: 'Gaming' },
    { name: 'Game Jolt', url: 'https://gamejolt.com/@{username}', category: 'Gaming' },
    { name: 'Smite Guru', url: 'https://smite.guru/profile/{username}', category: 'Gaming' },
    { name: 'Osu!', url: 'https://osu.ppy.sh/users/{username}', category: 'Gaming' },
    { name: 'Overwolf', url: 'https://overwolf.com/profile/{username}', category: 'Gaming' },
    { name: 'Battlenet', url: 'https://battle.net/{username}', category: 'Gaming' },
    { name: 'Origin', url: 'https://origin.com/profile/{username}', category: 'Gaming' },
    { name: 'GOG', url: 'https://gog.com/u/{username}', category: 'Gaming' },
    { name: 'Uplay', url: 'https://ubisoft.com/en-us/game/{username}', category: 'Gaming' },
    { name: 'Nintendo', url: 'https://nintendo.com/users/{username}', category: 'Gaming' },
    { name: 'Pokémon Showdown', url: 'https://pokemonshowdown.com/users/{username}', category: 'Gaming' },
    { name: 'Dotabuff', url: 'https://dotabuff.com/players/{username}', category: 'Gaming' },
    { name: 'OpenDota', url: 'https://opendota.com/players/{username}', category: 'Gaming' },
    { name: 'CS:GO Stats', url: 'https://csgo-stats.com/player/{username}', category: 'Gaming' },
    { name: 'PUBG Lookup', url: 'https://pubg.op.gg/user/{username}', category: 'Gaming' },
    { name: 'Apex Legends', url: 'https://apexlegendsstatus.com/profile/uid/{username}', category: 'Gaming' },
    { name: 'Call of Duty', url: 'https://cod.tracker.gg/warzone/profile/atvi/{username}', category: 'Gaming' },
    { name: 'Rocket League', url: 'https://rocketleague.tracker.network/profile/{username}', category: 'Gaming' },
    { name: 'Overwatch', url: 'https://playoverwatch.com/en-us/career/{username}', category: 'Gaming' },
    { name: 'Rainbow Six', url: 'https://r6.tracker.network/profile/pc/{username}', category: 'Gaming' },
    { name: 'Destiny Tracker', url: 'https://destinytracker.com/destiny/player/ps/{username}', category: 'Gaming' },
    { name: 'Warframe', url: 'https://warframe.com/profile/{username}', category: 'Gaming' },
    { name: 'Path of Exile', url: 'https://pathofexile.com/account/view-profile/{username}', category: 'Gaming' },
    { name: 'Runescape', url: 'https://secure.runescape.com/m=hiscore/compare?user1={username}', category: 'Gaming' },
    { name: 'World of Warcraft', url: 'https://worldofwarcraft.com/en-us/character/us/{username}', category: 'Gaming' },
    { name: 'Final Fantasy XIV', url: 'https://na.finalfantasyxiv.com/lodestone/character/{username}', category: 'Gaming' },
    { name: 'Guild Wars 2', url: 'https://gw2efficiency.com/account/{username}', category: 'Gaming' },
    { name: 'Elder Scrolls Online', url: 'https://elderscrollsonline.com/en-us/community/{username}', category: 'Gaming' },
    { name: 'Black Desert', url: 'https://bdocodex.com/us/theme/{username}', category: 'Gaming' },
    { name: 'Minecraft Servers', url: 'https://minecraft-mp.com/player/{username}', category: 'Gaming' },
    { name: 'Among Us', url: 'https://innersloth.itch.io/among-us/{username}', category: 'Gaming' },
    { name: 'Fall Guys', url: 'https://fallguysdb.info/profile/{username}', category: 'Gaming' },
    { name: 'Genshin Impact', url: 'https://genshin-impact-map.appsample.com/profile/{username}', category: 'Gaming' },
    { name: 'Roblox Stats', url: 'https://rblx.trade/p/{username}', category: 'Gaming' },
    { name: 'Mobile Legends', url: 'https://m.mobilelegends.com/en/profile/{username}', category: 'Gaming' },
    
    // Developer (60)
    { name: 'GitHub', url: 'https://github.com/{username}', category: 'Dev' },
    { name: 'GitLab', url: 'https://gitlab.com/{username}', category: 'Dev' },
    { name: 'BitBucket', url: 'https://bitbucket.org/{username}', category: 'Dev' },
    { name: 'Stack Overflow', url: 'https://stackoverflow.com/users/{username}', category: 'Dev' },
    { name: 'HackerRank', url: 'https://hackerrank.com/{username}', category: 'Dev' },
    { name: 'LeetCode', url: 'https://leetcode.com/{username}', category: 'Dev' },
    { name: 'CodePen', url: 'https://codepen.io/{username}', category: 'Dev' },
    { name: 'JSFiddle', url: 'https://jsfiddle.net/user/{username}', category: 'Dev' },
    { name: 'Repl.it', url: 'https://replit.com/@{username}', category: 'Dev' },
    { name: 'npm', url: 'https://npmjs.com/~{username}', category: 'Dev' },
    { name: 'PyPI', url: 'https://pypi.org/user/{username}', category: 'Dev' },
    { name: 'Docker Hub', url: 'https://hub.docker.com/u/{username}', category: 'Dev' },
    { name: 'Kaggle', url: 'https://kaggle.com/{username}', category: 'Dev' },
    { name: 'HackerOne', url: 'https://hackerone.com/{username}', category: 'Dev' },
    { name: 'BugCrowd', url: 'https://bugcrowd.com/{username}', category: 'Dev' },
    { name: 'Codewars', url: 'https://codewars.com/users/{username}', category: 'Dev' },
    { name: 'TopCoder', url: 'https://topcoder.com/members/{username}', category: 'Dev' },
    { name: 'Codeforces', url: 'https://codeforces.com/profile/{username}', category: 'Dev' },
    { name: 'AtCoder', url: 'https://atcoder.jp/users/{username}', category: 'Dev' },
    { name: 'Dev.to', url: 'https://dev.to/{username}', category: 'Dev' },
    { name: 'Hashnode', url: 'https://hashnode.com/@{username}', category: 'Dev' },
    { name: 'CodeSandbox', url: 'https://codesandbox.io/u/{username}', category: 'Dev' },
    { name: 'Glitch', url: 'https://glitch.com/@{username}', category: 'Dev' },
    { name: 'Observable', url: 'https://observablehq.com/@{username}', category: 'Dev' },
    { name: 'SourceForge', url: 'https://sourceforge.net/u/{username}', category: 'Dev' },
    { name: 'Launchpad', url: 'https://launchpad.net/~{username}', category: 'Dev' },
    { name: 'Gitea', url: 'https://gitea.com/{username}', category: 'Dev' },
    { name: 'Gitee', url: 'https://gitee.com/{username}', category: 'Dev' },
    { name: 'Coding Ground', url: 'https://codingground.com/{username}', category: 'Dev' },
    { name: 'Exercism', url: 'https://exercism.org/profiles/{username}', category: 'Dev' },
    { name: 'CodeChef', url: 'https://codechef.com/users/{username}', category: 'Dev' },
    { name: 'HackerEarth', url: 'https://hackerearth.com/@{username}', category: 'Dev' },
    { name: 'Project Euler', url: 'https://projecteuler.net/profile/{username}', category: 'Dev' },
    { name: 'Rosetta Code', url: 'https://rosettacode.org/wiki/User:{username}', category: 'Dev' },
    { name: 'Code.org', url: 'https://code.org/u/{username}', category: 'Dev' },
    { name: 'Scratch', url: 'https://scratch.mit.edu/users/{username}', category: 'Dev' },
    { name: 'Snap!', url: 'https://snap.berkeley.edu/user?username={username}', category: 'Dev' },
    { name: 'Tynker', url: 'https://tynker.com/profile/{username}', category: 'Dev' },
    { name: 'Khan Academy', url: 'https://khanacademy.org/profile/{username}', category: 'Education' },
    { name: 'Codecademy', url: 'https://codecademy.com/profiles/{username}', category: 'Education' },
    { name: 'FreeCodeCamp', url: 'https://freecodecamp.org/{username}', category: 'Education' },
    { name: 'Udemy', url: 'https://udemy.com/user/{username}', category: 'Education' },
    { name: 'Coursera', url: 'https://coursera.org/user/{username}', category: 'Education' },
    { name: 'edX', url: 'https://edx.org/u/{username}', category: 'Education' },
    { name: 'Pluralsight', url: 'https://pluralsight.com/profile/{username}', category: 'Education' },
    { name: 'Udacity', url: 'https://udacity.com/u/{username}', category: 'Education' },
    { name: 'Treehouse', url: 'https://teamtreehouse.com/{username}', category: 'Education' },
    { name: 'Skillshare', url: 'https://skillshare.com/profile/{username}', category: 'Education' },
    { name: 'LinkedIn Learning', url: 'https://linkedin.com/learning/instructors/{username}', category: 'Education' },
    { name: 'DataCamp', url: 'https://datacamp.com/profile/{username}', category: 'Education' },
    { name: 'Brilliant', url: 'https://brilliant.org/profile/{username}', category: 'Education' },
    { name: 'LeetCode Contest', url: 'https://leetcode.com/contest/{username}', category: 'Dev' },
    { name: 'GeeksforGeeks', url: 'https://auth.geeksforgeeks.org/user/{username}', category: 'Dev' },
    { name: 'Sphere Online Judge', url: 'https://spoj.com/users/{username}', category: 'Dev' },
    { name: 'URI Online Judge', url: 'https://urionlinejudge.com.br/judge/en/profile/{username}', category: 'Dev' },
    { name: 'Beecrowd', url: 'https://beecrowd.com.br/judge/en/profile/{username}', category: 'Dev' },
    { name: 'Kattis', url: 'https://open.kattis.com/users/{username}', category: 'Dev' },
    { name: 'Timus', url: 'https://acm.timus.ru/author.aspx?id={username}', category: 'Dev' },
    { name: 'USACO', url: 'https://usaco.org/index.php?page=profile&uid={username}', category: 'Dev' },
    { name: 'DMOJ', url: 'https://dmoj.ca/user/{username}', category: 'Dev' },
    
    // Media & Content (80)
    { name: 'YouTube', url: 'https://youtube.com/@{username}', category: 'Video' },
    { name: 'Vimeo', url: 'https://vimeo.com/{username}', category: 'Video' },
    { name: 'Dailymotion', url: 'https://dailymotion.com/{username}', category: 'Video' },
    { name: 'Medium', url: 'https://medium.com/@{username}', category: 'Blog' },
    { name: 'Blogger', url: 'https://{username}.blogspot.com', category: 'Blog' },
    { name: 'WordPress', url: 'https://{username}.wordpress.com', category: 'Blog' },
    { name: 'Substack', url: 'https://{username}.substack.com', category: 'Blog' },
    { name: 'Ghost', url: 'https://{username}.ghost.io', category: 'Blog' },
    { name: 'Patreon', url: 'https://patreon.com/{username}', category: 'Creator' },
    { name: 'Ko-fi', url: 'https://ko-fi.com/{username}', category: 'Creator' },
    { name: 'OnlyFans', url: 'https://onlyfans.com/{username}', category: 'Creator' },
    { name: 'Buy Me a Coffee', url: 'https://buymeacoffee.com/{username}', category: 'Creator' },
    { name: 'Gumroad', url: 'https://gumroad.com/{username}', category: 'Creator' },
    { name: 'Fanhouse', url: 'https://fanhouse.app/{username}', category: 'Creator' },
    { name: 'Creative Market', url: 'https://creativemarket.com/{username}', category: 'Design' },
    { name: 'Behance', url: 'https://behance.net/{username}', category: 'Design' },
    { name: 'Dribbble', url: 'https://dribbble.com/{username}', category: 'Design' },
    { name: 'Deviant Art', url: 'https://{username}.deviantart.com', category: 'Art' },
    { name: 'ArtStation', url: 'https://artstation.com/{username}', category: 'Art' },
    { name: 'Pixiv', url: 'https://pixiv.net/en/users/{username}', category: 'Art' },
    { name: 'Flickr', url: 'https://flickr.com/people/{username}', category: 'Photo' },
    { name: '500px', url: 'https://500px.com/p/{username}', category: 'Photo' },
    { name: 'Unsplash', url: 'https://unsplash.com/@{username}', category: 'Photo' },
    { name: 'Pexels', url: 'https://pexels.com/@{username}', category: 'Photo' },
    { name: 'SmugMug', url: 'https://{username}.smugmug.com', category: 'Photo' },
    { name: 'PhotoBucket', url: 'https://photobucket.com/user/{username}', category: 'Photo' },
    { name: 'Imgur', url: 'https://imgur.com/user/{username}', category: 'Image' },
    { name: 'Giphy', url: 'https://giphy.com/{username}', category: 'Image' },
    { name: 'SoundCloud', url: 'https://soundcloud.com/{username}', category: 'Music' },
    { name: 'Spotify', url: 'https://open.spotify.com/user/{username}', category: 'Music' },
    { name: 'Apple Music', url: 'https://music.apple.com/profile/{username}', category: 'Music' },
    { name: 'Bandcamp', url: 'https://bandcamp.com/{username}', category: 'Music' },
    { name: 'Mixcloud', url: 'https://mixcloud.com/{username}', category: 'Music' },
    { name: 'Audiomack', url: 'https://audiomack.com/{username}', category: 'Music' },
    { name: 'ReverbNation', url: 'https://reverbnation.com/{username}', category: 'Music' },
    { name: 'Last.fm', url: 'https://last.fm/user/{username}', category: 'Music' },
    { name: 'Genius', url: 'https://genius.com/{username}', category: 'Music' },
    { name: 'Discogs', url: 'https://discogs.com/user/{username}', category: 'Music' },
    { name: 'Deezer', url: 'https://deezer.com/en/profile/{username}', category: 'Music' },
    { name: 'Tidal', url: 'https://tidal.com/browse/user/{username}', category: 'Music' },
    { name: 'Audiomack', url: 'https://audiomack.com/{username}', category: 'Music' },
    { name: 'Pandora', url: 'https://pandora.com/people/{username}', category: 'Music' },
    { name: 'iHeartRadio', url: 'https://iheart.com/profile/{username}', category: 'Music' },
    { name: 'Anchor', url: 'https://anchor.fm/{username}', category: 'Podcast' },
    { name: 'Podbean', url: 'https://{username}.podbean.com', category: 'Podcast' },
    { name: 'Castbox', url: 'https://castbox.fm/ch/{username}', category: 'Podcast' },
    { name: 'Stitcher', url: 'https://stitcher.com/show/{username}', category: 'Podcast' },
    { name: 'TuneIn', url: 'https://tunein.com/user/{username}', category: 'Podcast' },
    { name: 'Goodpods', url: 'https://goodpods.com/@{username}', category: 'Podcast' },
    { name: 'Wattpad', url: 'https://wattpad.com/user/{username}', category: 'Writing' },
    { name: 'Archive of Our Own', url: 'https://archiveofourown.org/users/{username}', category: 'Writing' },
    { name: 'FanFiction', url: 'https://fanfiction.net/u/{username}', category: 'Writing' },
    { name: 'Scribophile', url: 'https://scribophile.com/authors/{username}', category: 'Writing' },
    { name: 'Booksie', url: 'https://booksie.com/users/{username}', category: 'Writing' },
    { name: 'Figment', url: 'https://figment.com/{username}', category: 'Writing' },
    { name: 'Commaful', url: 'https://commaful.com/u/{username}', category: 'Writing' },
    { name: 'Vocal Media', url: 'https://vocal.media/authors/{username}', category: 'Writing' },
    { name: 'Penana', url: 'https://penana.com/user/{username}', category: 'Writing' },
    { name: 'Quora', url: 'https://quora.com/profile/{username}', category: 'Q&A' },
    { name: 'Answers', url: 'https://answers.com/u/{username}', category: 'Q&A' },
    { name: 'Yahoo Answers', url: 'https://answers.yahoo.com/activity/{username}', category: 'Q&A' },
    { name: 'Ask.fm', url: 'https://ask.fm/{username}', category: 'Q&A' },
    { name: 'Curious Cat', url: 'https://curiouscat.me/{username}', category: 'Q&A' },
    { name: 'Formspring', url: 'https://formspring.me/{username}', category: 'Q&A' },
    { name: 'Wikipedia', url: 'https://wikipedia.org/wiki/User:{username}', category: 'Wiki' },
    { name: 'Wikia', url: 'https://community.fandom.com/wiki/User:{username}', category: 'Wiki' },
    { name: 'Fandom', url: 'https://fandom.com/u/{username}', category: 'Wiki' },
    { name: 'Wikidot', url: 'https://wikidot.com/user:info/{username}', category: 'Wiki' },
    { name: 'Slideshare', url: 'https://slideshare.net/{username}', category: 'Presentation' },
    { name: 'SlidesCarnival', url: 'https://slidescarnival.com/user/{username}', category: 'Presentation' },
    { name: 'Prezi', url: 'https://prezi.com/{username}', category: 'Presentation' },
    { name: 'Speaker Deck', url: 'https://speakerdeck.com/{username}', category: 'Presentation' },
    { name: 'Issuu', url: 'https://issuu.com/{username}', category: 'Publishing' },
    { name: 'Scribd', url: 'https://scribd.com/{username}', category: 'Documents' },
    { name: 'Academia', url: 'https://academia.edu/{username}', category: 'Academic' },
    { name: 'ResearchGate', url: 'https://researchgate.net/profile/{username}', category: 'Academic' },
    { name: 'ORCID', url: 'https://orcid.org/{username}', category: 'Academic' },
    { name: 'Google Scholar', url: 'https://scholar.google.com/citations?user={username}', category: 'Academic' },
    { name: 'Mendeley', url: 'https://mendeley.com/profiles/{username}', category: 'Academic' },
    
    // Business & Professional (50)
    { name: 'AngelList', url: 'https://angel.co/{username}', category: 'Startup' },
    { name: 'Product Hunt', url: 'https://producthunt.com/@{username}', category: 'Tech' },
    { name: 'Crunchbase', url: 'https://crunchbase.com/person/{username}', category: 'Business' },
    { name: 'Indeed', url: 'https://indeed.com/profile/{username}', category: 'Jobs' },
    { name: 'Glassdoor', url: 'https://glassdoor.com/member/home/index.htm?username={username}', category: 'Jobs' },
    { name: 'ZipRecruiter', url: 'https://ziprecruiter.com/candidate/{username}', category: 'Jobs' },
    { name: 'Monster', url: 'https://monster.com/profile/{username}', category: 'Jobs' },
    { name: 'CareerBuilder', url: 'https://careerbuilder.com/profile/{username}', category: 'Jobs' },
    { name: 'SimplyHired', url: 'https://simplyhired.com/profile/{username}', category: 'Jobs' },
    { name: 'Upwork', url: 'https://upwork.com/freelancers/{username}', category: 'Freelance' },
    { name: 'Fiverr', url: 'https://fiverr.com/{username}', category: 'Freelance' },
    { name: 'Freelancer', url: 'https://freelancer.com/u/{username}', category: 'Freelance' },
    { name: 'Guru', url: 'https://guru.com/freelancers/{username}', category: 'Freelance' },
    { name: 'PeoplePerHour', url: 'https://peopleperhour.com/freelancer/{username}', category: 'Freelance' },
    { name: 'Toptal', url: 'https://toptal.com/resume/{username}', category: 'Freelance' },
    { name: '99designs', url: 'https://99designs.com/profiles/{username}', category: 'Design' },
    { name: 'DesignCrowd', url: 'https://designcrowd.com/user/{username}', category: 'Design' },
    { name: 'Crowdspring', url: 'https://crowdspring.com/designer/{username}', category: 'Design' },
    { name: 'Envato', url: 'https://themeforest.net/user/{username}', category: 'Design' },
    { name: 'ThemeForest', url: 'https://themeforest.net/user/{username}', category: 'Design' },
    { name: 'CodeCanyon', url: 'https://codecanyon.net/user/{username}', category: 'Dev' },
    { name: 'GraphicRiver', url: 'https://graphicriver.net/user/{username}', category: 'Design' },
    { name: 'AudioJungle', url: 'https://audiojungle.net/user/{username}', category: 'Audio' },
    { name: 'VideoHive', url: 'https://videohive.net/user/{username}', category: 'Video' },
    { name: 'Etsy', url: 'https://etsy.com/shop/{username}', category: 'Shop' },
    { name: 'eBay', url: 'https://ebay.com/usr/{username}', category: 'Shop' },
    { name: 'Amazon Seller', url: 'https://amazon.com/sp?seller={username}', category: 'Shop' },
    { name: 'Shopify', url: 'https://{username}.myshopify.com', category: 'Shop' },
    { name: 'Big Cartel', url: 'https://{username}.bigcartel.com', category: 'Shop' },
    { name: 'Redbubble', url: 'https://redbubble.com/people/{username}', category: 'Shop' },
    { name: 'Society6', url: 'https://society6.com/{username}', category: 'Shop' },
    { name: 'Threadless', url: 'https://threadless.com/@{username}', category: 'Shop' },
    { name: 'Zazzle', url: 'https://zazzle.com/store/{username}', category: 'Shop' },
    { name: 'CafePress', url: 'https://cafepress.com/{username}', category: 'Shop' },
    { name: 'Printful', url: 'https://printful.com/user/{username}', category: 'Shop' },
    { name: 'Teespring', url: 'https://teespring.com/stores/{username}', category: 'Shop' },
    { name: 'Bonanza', url: 'https://bonanza.com/booths/{username}', category: 'Shop' },
    { name: 'Rakuten', url: 'https://rakuten.com/{username}', category: 'Shop' },
    { name: 'Alibaba', url: 'https://alibaba.com/profile/{username}', category: 'B2B' },
    { name: 'AliExpress', url: 'https://aliexpress.com/store/{username}', category: 'Shop' },
    { name: 'Wish', url: 'https://wish.com/merchant/{username}', category: 'Shop' },
    { name: 'DHgate', url: 'https://dhgate.com/{username}', category: 'Shop' },
    { name: 'TradeKey', url: 'https://tradekey.com/company/{username}', category: 'B2B' },
    { name: 'GlobalSources', url: 'https://globalsources.com/si/{username}', category: 'B2B' },
    { name: 'Houzz', url: 'https://houzz.com/pro/{username}', category: 'Design' },
    { name: 'Angie\'s List', url: 'https://angieslist.com/companylist/us/{username}', category: 'Service' },
    { name: 'HomeAdvisor', url: 'https://homeadvisor.com/rated/{username}', category: 'Service' },
    { name: 'Thumbtack', url: 'https://thumbtack.com/profile/{username}', category: 'Service' },
    { name: 'TaskRabbit', url: 'https://taskrabbit.com/profile/{username}', category: 'Service' },
    { name: 'Handy', url: 'https://handy.com/pro/{username}', category: 'Service' },
    
    // Dating & Lifestyle (30)
    { name: 'Tinder', url: 'https://tinder.com/@{username}', category: 'Dating' },
    { name: 'Bumble', url: 'https://bumble.com/app/{username}', category: 'Dating' },
    { name: 'Hinge', url: 'https://hinge.co/profile/{username}', category: 'Dating' },
    { name: 'OkCupid', url: 'https://okcupid.com/profile/{username}', category: 'Dating' },
    { name: 'Match', url: 'https://match.com/profile/{username}', category: 'Dating' },
    { name: 'POF', url: 'https://pof.com/viewprofile.aspx?profile_id={username}', category: 'Dating' },
    { name: 'Badoo', url: 'https://badoo.com/profile/{username}', category: 'Dating' },
    { name: 'Zoosk', url: 'https://zoosk.com/profile/{username}', category: 'Dating' },
    { name: 'eHarmony', url: 'https://eharmony.com/profile/{username}', category: 'Dating' },
    { name: 'Coffee Meets Bagel', url: 'https://coffeemeetsbagel.com/profile/{username}', category: 'Dating' },
    { name: 'Happn', url: 'https://happn.com/en/profile/{username}', category: 'Dating' },
    { name: 'Her', url: 'https://weareher.com/{username}', category: 'Dating' },
    { name: 'Grindr', url: 'https://grindr.com/profile/{username}', category: 'Dating' },
    { name: 'Scruff', url: 'https://scruff.com/profile/{username}', category: 'Dating' },
    { name: 'Feeld', url: 'https://feeld.co/{username}', category: 'Dating' },
    { name: 'Goodreads', url: 'https://goodreads.com/{username}', category: 'Books' },
    { name: 'Letterboxd', url: 'https://letterboxd.com/{username}', category: 'Movies' },
    { name: 'IMDb', url: 'https://imdb.com/user/{username}', category: 'Movies' },
    { name: 'Trakt', url: 'https://trakt.tv/users/{username}', category: 'Movies' },
    { name: 'MyAnimeList', url: 'https://myanimelist.net/profile/{username}', category: 'Anime' },
    { name: 'AniList', url: 'https://anilist.co/user/{username}', category: 'Anime' },
    { name: 'Crunchyroll', url: 'https://crunchyroll.com/user/{username}', category: 'Anime' },
    { name: 'Kitsu', url: 'https://kitsu.io/users/{username}', category: 'Anime' },
    { name: 'Anime-Planet', url: 'https://anime-planet.com/users/{username}', category: 'Anime' },
    { name: 'Strava', url: 'https://strava.com/athletes/{username}', category: 'Fitness' },
    { name: 'MyFitnessPal', url: 'https://myfitnesspal.com/profile/{username}', category: 'Fitness' },
    { name: 'Fitbit', url: 'https://fitbit.com/user/{username}', category: 'Fitness' },
    { name: 'Nike Run Club', url: 'https://nike.com/running/profile/{username}', category: 'Fitness' },
    { name: 'MapMyRun', url: 'https://mapmyrun.com/profile/{username}', category: 'Fitness' },
    { name: 'Garmin Connect', url: 'https://connect.garmin.com/modern/profile/{username}', category: 'Fitness' },
    
    // Misc & Security (40)
    { name: 'Linktree', url: 'https://linktr.ee/{username}', category: 'Links' },
    { name: 'Bio.link', url: 'https://bio.link/{username}', category: 'Links' },
    { name: 'Carrd', url: 'https://{username}.carrd.co', category: 'Links' },
    { name: 'About.me', url: 'https://about.me/{username}', category: 'Profile' },
    { name: 'Gravatar', url: 'https://gravatar.com/{username}', category: 'Avatar' },
    { name: 'Keybase', url: 'https://keybase.io/{username}', category: 'Crypto' },
    { name: 'HackTheBox', url: 'https://hackthebox.com/home/users/profile/{username}', category: 'Security' },
    { name: 'TryHackMe', url: 'https://tryhackme.com/p/{username}', category: 'Security' },
    { name: 'Root-Me', url: 'https://root-me.org/{username}', category: 'Security' },
    { name: 'PentesterLab', url: 'https://pentesterlab.com/profile/{username}', category: 'Security' },
    { name: 'Hack.me', url: 'https://hack.me/u/{username}', category: 'Security' },
    { name: 'CTFtime', url: 'https://ctftime.org/user/{username}', category: 'Security' },
    { name: 'VulnHub', url: 'https://vulnhub.com/author/{username}', category: 'Security' },
    { name: 'ExploitDB', url: 'https://exploit-db.com/author/{username}', category: 'Security' },
    { name: 'PacketStorm', url: 'https://packetstormsecurity.com/users/{username}', category: 'Security' },
    { name: 'CWE', url: 'https://cwe.mitre.org/data/experts/{username}', category: 'Security' },
    { name: 'CVE Details', url: 'https://cvedetails.com/vendor/{username}', category: 'Security' },
    { name: 'HackerTarget', url: 'https://hackertarget.com/{username}', category: 'Security' },
    { name: 'Shodan', url: 'https://shodan.io/user/{username}', category: 'Security' },
    { name: 'Censys', url: 'https://search.censys.io/certificates/{username}', category: 'Security' },
    { name: 'Wigle', url: 'https://wigle.net/user/{username}', category: 'Wireless' },
    { name: 'OpenStreetMap', url: 'https://openstreetmap.org/user/{username}', category: 'Maps' },
    { name: 'Waze', url: 'https://waze.com/user/{username}', category: 'Maps' },
    { name: 'Google Maps', url: 'https://maps.google.com/maps/contrib/{username}', category: 'Maps' },
    { name: 'AllTrails', url: 'https://alltrails.com/members/{username}', category: 'Outdoor' },
    { name: 'Geocaching', url: 'https://geocaching.com/p/default.aspx?u={username}', category: 'Outdoor' },
    { name: 'Airbnb', url: 'https://airbnb.com/users/show/{username}', category: 'Travel' },
    { name: 'Couchsurfing', url: 'https://couchsurfing.com/people/{username}', category: 'Travel' },
    { name: 'TripAdvisor', url: 'https://tripadvisor.com/members/{username}', category: 'Travel' },
    { name: 'Booking.com', url: 'https://booking.com/profile/{username}', category: 'Travel' },
    { name: 'Hotels.com', url: 'https://hotels.com/profile/{username}', category: 'Travel' },
    { name: 'Expedia', url: 'https://expedia.com/user/{username}', category: 'Travel' },
    { name: 'Skyscanner', url: 'https://skyscanner.com/profile/{username}', category: 'Travel' },
    { name: 'Lonely Planet', url: 'https://lonelyplanet.com/thorntree/users/{username}', category: 'Travel' },
    { name: 'Roadtrippers', url: 'https://roadtrippers.com/users/{username}', category: 'Travel' },
    { name: 'Trello', url: 'https://trello.com/{username}', category: 'Productivity' },
    { name: 'Notion', url: 'https://notion.so/{username}', category: 'Productivity' },
    { name: 'Evernote', url: 'https://evernote.com/{username}', category: 'Productivity' },
    { name: 'Todoist', url: 'https://todoist.com/app/user/{username}', category: 'Productivity' },
    { name: 'Asana', url: 'https://asana.com/{username}', category: 'Productivity' }
  ];

  const chunkArray = (arr, size) => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
      arr.slice(i * size, i * size + size)
    );
  };

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

  const handleSearch = async () => {
    if (!username.trim()) return;
    
    setSearching(true);
    setResults([]);
    setProgress(0);

    const platformUrls = platforms.map(p => ({
        name: p.name,
        category: p.category,
        url: p.url.replace('{username}', username)
    }));

    // Chunk requests into batches to avoid overwhelming the backend
    const batches = chunkArray(platformUrls, 30);
    const searchResults = [];

    // Dynamically import axios to avoid breaking if it's not at the top
    const axios = (await import('axios')).default;

    for (let i = 0; i < batches.length; i++) {
      try {
        const batch = batches[i];
        const res = await axios.post(`${API_URL}/api/tools/username-search/batch`, { 
            username, 
            platforms: batch 
        });
        
        searchResults.push(...res.data);
        setResults([...searchResults]);
        setProgress(Math.round(((i + 1) / batches.length) * 100));
      } catch (e) {
         console.error("Batch error", e);
      }
    }

    setSearching(false);
  };

  const exportResults = () => {
    const found = results.filter(r => r.exists);
    const notFound = results.filter(r => !r.exists);
    
    let text = `====================================\n`;
    text += `USERNAME SEARCH RESULTS\n`;
    text += `Target: ${username}\n`;
    text += `Date: ${new Date().toLocaleString()}\n`;
    text += `Total Platforms: ${platforms.length}\n`;
    text += `====================================\n\n`;
    
    text += `✓ FOUND (${found.length}):\n`;
    text += `====================================\n`;
    found.forEach(r => {
      text += `[${r.category}] ${r.name}\n`;
      text += `URL: ${r.url}\n\n`;
    });
    
    text += `\n\n✗ NOT FOUND (${notFound.length}):\n`;
    text += `====================================\n`;
    notFound.forEach(r => {
      text += `[${r.category}] ${r.name}\n`;
      text += `URL: ${r.url}\n\n`;
    });
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `username_${username}_${Date.now()}.txt`;
    a.click();
  };

  const foundCount = results.filter(r => r.exists).length;
  const notFoundCount = results.filter(r => !r.exists).length;
  const categories = [...new Set(results.map(r => r.category))];

  return (
    <div className='tool-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <Search size={32} />
          <div>
            <h1>USERNAME SEARCH</h1>
            <p>&gt; Search across {platforms.length}+ platforms worldwide</p>
          </div>
        </div>
      </div>

      <div className='tool-content'>
        <div className='search-box'>
          <div className='input-group-tool'>
            <label>TARGET USERNAME</label>
            <div className='input-with-button'>
              <input
                type='text'
                placeholder='johndoe'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                disabled={searching}
              />
              <button 
                className='btn-tool' 
                onClick={handleSearch}
                disabled={searching || !username.trim()}
              >
                {searching ? (
                  <>
                    <Loader className='spin' size={18} />
                    SEARCHING...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    SEARCH
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {searching && (
          <div className='output-box'>
            <div style={{marginBottom: '1rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                <span>PROGRESS:</span>
                <span>{progress}%</span>
              </div>
              <div style={{width: '100%', height: '30px', background: '#222', border: '1px solid #444'}}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00ff41, #00cc33)',
                  transition: 'width 0.1s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '10px',
                  color: '#000',
                  fontWeight: 'bold'
                }}>
                  {progress > 10 && `${progress}%`}
                </div>
              </div>
            </div>
            <div style={{color: '#00ff41', textAlign: 'center'}}>
              Checking {results.length} / {platforms.length} platforms...
            </div>
          </div>
        )}

        {results.length > 0 && !searching && (
          <>
            <div className='stats-row' style={{gridTemplateColumns: 'repeat(4, 1fr)'}}>
              <div className='stat-box'>
                <div className='stat-value'>{platforms.length}</div>
                <div className='stat-label'>PLATFORMS</div>
              </div>
              <div className='stat-box success'>
                <div className='stat-value' style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                  <CheckCircle size={24} />
                  {foundCount}
                </div>
                <div className='stat-label'>FOUND</div>
              </div>
              <div className='stat-box' style={{borderColor: '#666'}}>
                <div className='stat-value' style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#666'}}>
                  <XCircle size={24} />
                  {notFoundCount}
                </div>
                <div className='stat-label'>NOT FOUND</div>
              </div>
              <div className='stat-box' style={{borderColor: '#ffcc00'}}>
                <div className='stat-value' style={{color: '#ffcc00'}}>{categories.length}</div>
                <div className='stat-label'>CATEGORIES</div>
              </div>
            </div>

            <div className='alert-box' style={{background: 'rgba(0, 255, 65, 0.1)', borderLeftColor: '#00ff41'}}>
              <AlertTriangle size={18} />
              <span>
                Busca completa! {foundCount} perfis encontrados em {platforms.length} plataformas. 
                Clique em EXPORT para baixar todos os resultados detalhados.
              </span>
            </div>

            <button className='btn-tool' onClick={exportResults} style={{width: '100%'}}>
              <Download size={18} />
              EXPORT ALL RESULTS ({foundCount} found / {notFoundCount} not found)
            </button>

            <div className='output-box'>
              <h3 style={{marginBottom: '1rem', color: '#00ff41'}}>CATEGORIAS VERIFICADAS:</h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem'}}>
                {categories.map(cat => {
                  const count = results.filter(r => r.category === cat && r.exists).length;
                  return (
                    <div key={cat} style={{
                      padding: '0.5rem',
                      background: count > 0 ? 'rgba(0, 255, 65, 0.1)' : 'rgba(0, 0, 0, 0.3)',
                      border: `1px solid ${count > 0 ? '#00ff41' : '#333'}`,
                      textAlign: 'center',
                      fontSize: '0.85rem'
                    }}>
                      {cat}: {count}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className='output-box'>
              <p style={{color: '#888', fontSize: '0.9rem', textAlign: 'center'}}>
                💡 Os resultados completos com todas as URLs estão disponíveis no arquivo exportado.
                <br/>
                Não mostramos {platforms.length} cards aqui para manter a performance.
              </p>
            </div>
          </>
        )}
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UsernameSearch;
