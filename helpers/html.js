const resetPasswordhtml = (resetLink, firstName) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Reset Your Password - Elite Cab</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333333;
                background-color: #f0f4f8;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 800px;
                width: 100%;
                margin: 20px auto;
                padding: 20px;
                border: 1px solid #d0dbe1;
                border-radius: 10px;
                box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
                background-color: #ffffff;
            }
            .header {
                background: #ff8800;
                padding: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                border-bottom: 2px solid #cc6f00;
                color: #ffffff;
                border-radius: 10px 10px 0 0;
            }
            .header img {
                width: 120px;
                height: 100px;
                object-fit: contain;
                position: absolute;
                left: 15px;
            }
            .content {
                padding: 20px;
                color: #333333;
            }
            .footer {
                background: #ff8800;
                padding: 15px;
                text-align: center;
                border-top: 2px solid #cc6f00;
                font-size: 0.9em;
                color: #ffffff;
                border-radius: 0 0 10px 10px;
            }
            .button {
                display: inline-block;
                background-color: #ff8800;
                color: #ffffff;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                transition: background-color 0.3s ease;
            }
            .button:hover {
                background-color: #cc6f00;
            }

            /* Mobile responsiveness */
            @media (max-width: 600px) {
                .container {
                    width: 90%;
                    margin: 10px auto;
                    padding: 10px;
                }
                .header, .footer {
                    padding: 10px;
                }
                .header h1 {
                    font-size: 1.5rem;
                }
                .content {
                    padding: 15px;
                }
                .button {
                    padding: 10px 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://elitecab.com/assets/logo.png" alt="Elite Cab Logo">
                <h1>Reset Your Password</h1>
            </div>
            <div class="content">
                <p>Hello ${firstName},</p>
                <p>We received a request to reset your password for your Elite Cab account. Click the button below to reset your password:</p>
                <p>
                    <a href="${resetLink}" class="button">Reset My Password</a>
                </p>
                <p>If you did not request a password reset, please ignore this email or contact our support team immediately.</p>
                <p>This password reset link will expire in 24 hours for security purposes.</p>
                <p>Best regards,<br>Elite Cab Team</p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Elite Cab. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};


module.exports = resetPasswordhtml