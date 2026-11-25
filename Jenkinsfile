
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
            echo 'Drive Mini - BUILD SUCCESS'
        }

        failure {
            echo 'Drive Mini - BUILD FAILED'
        }
    }
}
