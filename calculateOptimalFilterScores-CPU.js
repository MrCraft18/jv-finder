function generateCombinations(min, max, integerCount, callback) {
    function helper(currentCombination) {
        if (currentCombination.length === integerCount) {
            callback([...currentCombination]);
            return;
        }

        for (let i = min; i <= max; i++) {
            currentCombination.push(i)
            helper(currentCombination)
            currentCombination.pop()
        }
    }

    helper([])
}

function formatTime(hours, minutes, seconds) {
    const formattedHours = hours < 10 ? `0${hours}` : hours
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`
}

function calculateElapsedTime(startTime) {
    const currentTime = new Date()
    const elapsedSeconds = Math.floor((currentTime - startTime) / 1000)

    const hours = Math.floor(elapsedSeconds / 3600)
    const minutes = Math.floor((elapsedSeconds % 3600) / 60)
    const seconds = elapsedSeconds % 60

    return formatTime(hours, minutes, seconds)
}

function calculateETA(totalProgress, currentProgress, startTime) {
    const currentTime = new Date()
    const elapsedTimeInSeconds = (currentTime - startTime) / 1000
    const estimatedTimeRemainingInSeconds = (totalProgress - currentProgress) / (currentProgress / elapsedTimeInSeconds)

    const hours = Math.floor(estimatedTimeRemainingInSeconds / 3600)
    const minutes = Math.floor((estimatedTimeRemainingInSeconds % 3600) / 60)
    const seconds = Math.floor(estimatedTimeRemainingInSeconds % 60)

    return formatTime(hours, minutes, seconds)
}



const startTime = new Date()
const min = 0
const max = 2
const length = 30

function calculateCombinations(minValue, maxValue, numDigits) {
    if (numDigits <= 0 || minValue > maxValue) {
        return 0
    }

    const range = maxValue - minValue + 1
    return Math.pow(range, numDigits)
}

const totalCombinations = calculateCombinations(min, max, length)
console.log(totalCombinations)
let timerTimestamp = new Date()
let totalCount = 0

generateCombinations(min, max, length, combination => {
    totalCount++

    if (new Date() - timerTimestamp >= 1000) {
        process.stdout.write(`\r${totalCount.toLocaleString()} / ${totalCombinations.toLocaleString()} | ${((totalCount / totalCombinations) * 100).toFixed(2)}% | Elapsed: ${calculateElapsedTime(startTime)} | ETA: ${calculateETA(totalCombinations, totalCount, startTime)} `)

        timerTimestamp = new Date()
    }
})
process.stdout.write(`\r${totalCombinations.toLocaleString()} / ${totalCombinations.toLocaleString()} | 100% | Elapsed: ${calculateElapsedTime(startTime)} | ETA: ${calculateETA(totalCombinations, totalCount, startTime)}`)
process.stdout.write('  \n')