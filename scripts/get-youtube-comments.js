#!/usr/bin/env node

/**
 * YouTube 베스트 댓글 수집 스크립트 (Node.js 버전)
 * 사용법: node scripts/get-youtube-comments.js "YouTube_URL" [댓글_개수]
 */

const https = require('https');
const fs = require('fs');

// .env.local 파일에서 환경변수 로드
function loadEnv() {
    try {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    } catch (error) {
        // .env.local 파일이 없어도 계속 진행
    }
}

// YouTube Video ID 추출 함수
function extractVideoId(url) {
    const patterns = [
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
        /youtu\.be\/([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    
    throw new Error('유효하지 않은 YouTube URL입니다.');
}

// API 호출 함수
function apiCall(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// 메인 함수
async function main() {
    // 환경변수 로드
    loadEnv();
    
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log('사용법: node scripts/get-youtube-comments.js "YouTube_URL" [댓글_개수]');
        console.log('예시: node scripts/get-youtube-comments.js "https://www.youtube.com/shorts/Hd1FSSjsEhk" 5');
        process.exit(1);
    }
    
    const youtubeUrl = args[0];
    const maxComments = parseInt(args[1]) || 5;
    
    // API 키 확인
    if (!process.env.YOUTUBE_API_KEY) {
        console.error('오류: YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.');
        process.exit(1);
    }
    
    try {
        const videoId = extractVideoId(youtubeUrl);
        console.log(`Video ID: ${videoId}`);
        console.log(`댓글 수집 개수: ${maxComments}`);
        console.log('='.repeat(50));
        
        // 1단계: 비디오 정보 수집
        console.log('📹 비디오 정보 수집 중...');
        const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`;
        const videoData = await apiCall(videoUrl);
        
        if (videoData.error) {
            throw new Error(`YouTube API 오류: ${videoData.error.message}`);
        }
        
        if (!videoData.items || videoData.items.length === 0) {
            throw new Error('비디오를 찾을 수 없습니다.');
        }
        
        const video = videoData.items[0];
        console.log(`제목: ${video.snippet.title}`);
        console.log(`채널: ${video.snippet.channelTitle}`);
        console.log(`조회수: ${parseInt(video.statistics.viewCount).toLocaleString()}회`);
        console.log(`좋아요: ${parseInt(video.statistics.likeCount).toLocaleString()}개`);
        console.log(`댓글수: ${parseInt(video.statistics.commentCount).toLocaleString()}개`);
        console.log('='.repeat(50));
        
        // 2단계: 베스트 댓글 수집
        console.log(`💬 베스트 댓글 ${maxComments}개 수집 중...`);
        const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=${maxComments}&order=relevance&key=${process.env.YOUTUBE_API_KEY}`;
        const commentsData = await apiCall(commentsUrl);
        
        if (commentsData.error) {
            throw new Error(`댓글 API 오류: ${commentsData.error.message}`);
        }
        
        if (!commentsData.items || commentsData.items.length === 0) {
            console.log('댓글이 없습니다.');
            return;
        }
        
        // 댓글 출력
        commentsData.items.forEach((item, index) => {
            const comment = item.snippet.topLevelComment.snippet;
            console.log(`\n${index + 1}. 👤 ${comment.authorDisplayName}`);
            console.log(`   ❤️  ${parseInt(comment.likeCount).toLocaleString()} 좋아요`);
            console.log(`   💬 ${comment.textDisplay.replace(/<br>/g, '\n      ')}`);
            console.log(`   📅 ${new Date(comment.publishedAt).toLocaleString('ko-KR')}`);
            console.log('='.repeat(50));
        });
        
        console.log('✅ 댓글 수집 완료!');
        
        // JSON 형태로도 출력 (개발용)
        const result = {
            video: {
                id: videoId,
                title: video.snippet.title,
                channel: video.snippet.channelTitle,
                viewCount: parseInt(video.statistics.viewCount),
                likeCount: parseInt(video.statistics.likeCount),
                commentCount: parseInt(video.statistics.commentCount)
            },
            comments: commentsData.items.map(item => ({
                id: item.id,
                author: item.snippet.topLevelComment.snippet.authorDisplayName,
                text: item.snippet.topLevelComment.snippet.textDisplay,
                likeCount: parseInt(item.snippet.topLevelComment.snippet.likeCount),
                publishedAt: item.snippet.topLevelComment.snippet.publishedAt
            }))
        };
        
        // JSON 결과를 파일로 저장 (선택적)
        if (args.includes('--json')) {
            const fs = require('fs');
            const filename = `youtube-comments-${videoId}-${Date.now()}.json`;
            fs.writeFileSync(filename, JSON.stringify(result, null, 2));
            console.log(`📄 JSON 결과 저장됨: ${filename}`);
        }
        
    } catch (error) {
        console.error(`오류: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { extractVideoId, apiCall, main };