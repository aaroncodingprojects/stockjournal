//Event Listener for .csv file load
document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: false,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.errors.length > 0) {
                    showError("Error parsing the CSV file: " + results.errors.map(e => e.message).join(", "));
                    return;
                }

                if (results.data.length < 2) { // Check if there are at least 2 rows (header + data)
                    showError("The CSV file does not contain enough rows.");
                    return;
                }

                const headers = results.data[0]; // Get the headers from the first row
                const data = results.data.slice(1); // Get the data starting from the second row

                const formattedData = data.map(row => {
                    return headers.reduce((acc, header, index) => {
                        acc[header] = row[index];
                        return acc;
                    }, {});
                });

                // Validate and filter data
                const validData = formattedData.filter(trade => {
                    const date = trade.DATE;
                    const amount = parseFloat(trade.AMOUNT);
                    const isValidDate = isValidDateFormat(date); // Check if date is valid
                    const isValidAmount = !isNaN(amount); // Check if amount is a number
                    return isValidDate && isValidAmount; // Keep only valid entries
                });

                console.log(validData);

                if (validData.length === 0) {
                    showError("No valid data found in the CSV file.");
                    return;
                }

                processTrades(validData);
                
                // i believe this is leftover code from when we had dynamic containers, too complex for me
                //createNewContainer(); 
                
            },
            error: function(error) {
                showError("Error reading the file: " + error.message);
            }
        });
    } else {
        showError("No file selected. Please select a CSV file.");
    }
});

// Function to validate the date format M/DD/YY
function isValidDateFormat(dateString) {
    const dateParts = dateString.split('/');
    if (dateParts.length !== 3) return false;
    const month = parseInt(dateParts[0], 10);
    const day = parseInt(dateParts[1], 10);
    const year = parseInt(dateParts[2], 10) + 2000; // Assuming the year is in 2000s
    const date = new Date(year, month - 1, day); // Month is 0-indexed in JavaScript
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function processTrades(data) {
    const dailyGains = {};
    let totalMiscFees = 0; // Variable to hold total miscellaneous fees
    let totalCommissionsFees = 0; // Variable to hold total commissions and fees
    
    // Aggregate daily gains and losses and fees
    data.forEach(trade => {
        const date = trade.DATE;
        const amount = parseFloat(trade.AMOUNT);
        const miscFees = parseFloat(trade['Misc Fees']) || 0; // Get Misc Fees, default to 0 if NaN
        const commissionsFees = parseFloat(trade['Commissions & Fees']) || 0; // Get Commissions & Fees, default to 0 if NaN
        if (!dailyGains[date]) {
            dailyGains[date] = 0;
        }
        dailyGains[date] += amount; // This can be positive (gain) or negative (loss)
        totalMiscFees += miscFees;
        totalCommissionsFees += commissionsFees;
    });

    // Calculate total gains/losses for worksheet
    const dailyTotal = Object.values(dailyGains).reduce((acc, gain) => acc + gain, 0);

    // Display daily gains/losses and total fees
    displayData(totalMiscFees, totalCommissionsFees, dailyTotal); // Call a new function to display total fees

    // Prepare data for chart
    const labels = Object.keys(dailyGains);
    const gains = Object.values(dailyGains);
    const initialFontSize = Math.max(12, 800 / 50); // Example calculation based on initial height
    createChart(labels, gains, initialFontSize);
}

// Function to display data such as fees and totals
function displayData(miscFees, commissionsFees, daily) {
    const feesMessageDiv = document.getElementById('total-misc-fees');
	const commsMessageDiv = document.getElementById('total-commissions-fees');
	const calculateTotal =  Number(daily) + Number(miscFees) + Number(commissionsFees);
	const grandTotalDiv = document.getElementById('grand-total-fees');
		//console.log(Number(calculateTotal));
		//console.log(Number(miscFees));
		//console.log(Number(commissionsFees));
	document.getElementById('total-gains').textContent = `CSV Total Gains/Losses (before Fees): $${daily.toFixed(2)}`;
    feesMessageDiv.textContent = `CSV Total Misc Fees: $${miscFees.toFixed(2)}`;
	commsMessageDiv.textContent = `CSV Total Commissions & Fees: $${commissionsFees.toFixed(2)}`;
	grandTotalDiv.textContent = `CSV Total Gains/Losses (after Fees): $${calculateTotal.toFixed(2)}`;

}

function createChart(labels, gains, fontSize) {
    const ctx = document.getElementById('myChart').getContext('2d');

    // Check if the canvas context is valid
    if (!ctx) {
        showError("Error: Unable to get the canvas context.");
        return;
    }

    // Get the computed styles for the chart container
    const chartContainer = document.querySelector('.chart-container');
    const computedStyle = getComputedStyle(chartContainer);
    
    // Set the canvas size based on the computed styles of the container
    const width = parseInt(computedStyle.width, 10);
    const height = parseInt(computedStyle.height, 10);
    
    canvas.width = width; // Set the width of the canvas
    canvas.height = height; // Set the height of the canvas

    // Check if labels and gains are valid arrays
    if (!Array.isArray(labels) || !Array.isArray(gains)) {
        showError("Error: Invalid data format. Labels and gains must be arrays.");
        return;
    }

    // Check if there are any data points to display
    if (labels.length === 0 || gains.length === 0) {
        showError("No data available to display the chart.");
        return;
    }

    // Clear any existing chart before creating a new one
    if (window.myChart instanceof Chart) {
        window.myChart.destroy(); // Only call destroy if myChart is a Chart instance
    }

    try {
        // Create a color array based on gains
        const backgroundColors = gains.map(gain => gain >= 0 ? 'rgba(75, 192, 192, 0.2)' : 'rgba(255, 99, 132, 0.2)');
        const borderColors = gains.map(gain => gain >= 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)');

        window.myChart = new Chart(ctx, {
            type: 'bar', // Change to 'bar' for a bar chart
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gains/Losses per Day',
                    data: gains,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                size: fontSize,
                                weight: 'bold',
                                color: 'black'
                            }
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: fontSize,
                                weight: 'bold',
                                color: 'black'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            font: {
                                size: fontSize + 2,
                                weight: 'bold',
                                color: 'black'
                            }
                        }
                    },
                    tooltip: {
                        bodyFont: {
                            size: fontSize
                        }
                    },
                    title: {
                        display: true,
                        text: 'Gains/Losses Chart',
                        font: {
                            size: Math.max(fontSize + 2, 14), // Ensure title is readable
                            weight: 'bold',
                            color: 'black'
                        }
                    }
                }
            }
        });

        console.log("Chart created successfully:", window.myChart); // Log the chart object

    } catch (error) {
        showError("Error creating the chart: " + error.message);
    }
}

// Function to show error messages
function showError(message) {
    const errorMessageDiv = document.getElementById('error-message');
    errorMessageDiv.textContent = message;
}

// Resizing functionality
const resizeHandle = document.getElementById('resize-handle');
const chartContainer = document.querySelector('.chart-container');
const canvas = document.getElementById('myChart');

let isResizing = false;

resizeHandle.addEventListener('mousedown', (event) => {
    isResizing = true;
});

//Resizing Event Listener
document.addEventListener('mousemove', (event) => {
    if (isResizing) {
        const newWidth = event.clientX - chartContainer.getBoundingClientRect().left;
        const newHeight = event.clientY - chartContainer.getBoundingClientRect().top;

        // Set minimum width and height
        if (newWidth > 100 && newHeight > 100) {
            chartContainer.style.width = newWidth + 'px';
            chartContainer.style.height = newHeight + 'px';
            canvas.width = newWidth; // Update canvas width
            canvas.height = newHeight; // Update canvas height
            
            // Calculate a new font size based on the new height
            const newFontSize = Math.max(12, newHeight / 50); // Example calculation
            createChart(window.myChart.data.labels, window.myChart.data.datasets[0].data, newFontSize); // Recreate the chart with new dimensions and font size
        }
    }
});

document.addEventListener('mouseup', () => {
    isResizing = false;
});
