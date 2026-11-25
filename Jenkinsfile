
def notifyTelegram(String status) {
    try {
        withCredentials([
            string(
                credentialsId: 'drive-mini-telegram-token',
                variable: 'TELEGRAM_TOKEN'
            ),
            string(
                credentialsId: 'drive-mini-telegram-chat-id',
                variable: 'TELEGRAM_CHAT_ID'
            )
        ]) {
            withEnv(["BUILD_STATUS=${status}"]) {
                sh '''
                    set +x
                    curl -fs --max-time 20 -X POST \
                    "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
                    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
                    --data-urlencode "text=Drive Mini - ${BUILD_STATUS}
Job: ${JOB_NAME}
Build: #${BUILD_NUMBER}" \
                    > /dev/null
                '''
            }
        }
        echo 'Telegram notification sent'
    } catch (Exception e) {
        echo 'Telegram notification failed'
    }
}

pipeline {
    agent any

    triggers {
        pollSCM('H/2 * * * *')
    }

    options {
        disableConcurrentBuilds()
        skipDefaultCheckout()
    }

    stages {
        stage('Notify Start') {
            steps {
                script {
                    notifyTelegram('BUILD STARTED')
                }
            }
        }

        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/Yanz1609/DevOps.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Verify Build') {
            steps {
                sh 'test -f frontend/dist/index.html'
            }
        }
    }

    post {
        success {
            script {
                notifyTelegram('BUILD SUCCESS')
            }
        }

        failure {
            script {
                notifyTelegram('BUILD FAILED')
            }
        }
    }
}
