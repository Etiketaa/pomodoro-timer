class Chatbox {
    constructor() {
        this.args = {
            openButton: document.querySelector('.chatbox__button'),
            chatBox: document.querySelector('.chatbox__support'),
            sendButton: document.querySelector('.send__button'),
            backdrop: document.querySelector('.chatbox-backdrop')
        }

        this.state = false;
        this.messages = [];
        this.conversationHistory = [];
    }

    display() {
        const { openButton, chatBox, sendButton, backdrop } = this.args;

        openButton.addEventListener('click', () => this.toggleState(chatBox, backdrop))

        sendButton.addEventListener('click', () => this.onSendButton(chatBox))

        const node = chatBox.querySelector('input');
        node.addEventListener("keyup", ({ key }) => {
            if (key === "Enter") {
                this.onSendButton(chatBox)
            }
        })

        // Add welcome message
        this.addWelcomeMessage();
    }

    addWelcomeMessage() {
        const welcomeMsg = {
            name: "Assistant",
            message: "¡Hola! 👋 Soy tu asistente de productividad. Puedo ayudarte a:\n\n• Organizar y priorizar tareas\n• Dividir tareas grandes\n• Estimar tiempo en pomodoros\n• Darte consejos de concentración\n\n¿En qué te ayudo?"
        };
        this.messages.push(welcomeMsg);
    }

    toggleState(chatbox, backdrop) {
        this.state = !this.state;

        if (this.state) {
            chatbox.classList.add('chatbox--active')
            backdrop.classList.add('chatbox-backdrop--active')
            this.updateChatText(chatbox);
        } else {
            chatbox.classList.remove('chatbox--active')
            backdrop.classList.remove('chatbox-backdrop--active')
        }
    }

    getUserTasks() {
        // Get tasks from localStorage
        try {
            const tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];
            return tasks.map(task => ({
                text: task.text,
                status: task.status,
                description: task.description || ''
            }));
        } catch (e) {
            return [];
        }
    }

    getPomodorosToday() {
        // Get pomodoros completed today
        try {
            const stats = JSON.parse(localStorage.getItem('pomodoroStats')) || {};
            const today = new Date().toISOString().slice(0, 10);
            return stats[today] || 0;
        } catch (e) {
            return 0;
        }
    }

    onSendButton(chatbox) {
        var textField = chatbox.querySelector('input');
        let text1 = textField.value.trim();
        if (text1 === "") {
            return;
        }

        let msg1 = { name: "User", message: text1 }
        this.messages.push(msg1);
        this.conversationHistory.push({ role: "user", content: text1 });

        // Show typing indicator
        this.showTypingIndicator(chatbox);
        textField.value = '';

        // Get user context
        const userTasks = this.getUserTasks();
        const pomodorosToday = this.getPomodorosToday();

        fetch('/api/chat', {
            method: 'POST',
            body: JSON.stringify({
                message: text1,
                history: this.conversationHistory.slice(-6), // Last 6 messages
                tasks: userTasks,
                pomodoros_today: pomodorosToday
            }),
            headers: {
                'Content-Type': 'application/json'
            },
        })
            .then(r => r.json())
            .then(r => {
                this.hideTypingIndicator(chatbox);
                let msg2 = { name: "Assistant", message: r.answer };
                this.messages.push(msg2);
                this.conversationHistory.push({ role: "assistant", content: r.answer });
                this.updateChatText(chatbox);

            }).catch((error) => {
                console.error('Error:', error);
                this.hideTypingIndicator(chatbox);
                let errorMsg = {
                    name: "Assistant",
                    message: "Lo siento, hubo un error. Por favor intenta de nuevo. 😅"
                };
                this.messages.push(errorMsg);
                this.updateChatText(chatbox);
            });
    }

    showTypingIndicator(chatbox) {
        const chatmessage = chatbox.querySelector('.chatbox__messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        chatmessage.insertBefore(typingDiv, chatmessage.firstChild);
    }

    hideTypingIndicator(chatbox) {
        const typingIndicator = chatbox.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    updateChatText(chatbox) {
        var html = '';
        this.messages.slice().reverse().forEach(function (item, index) {
            if (item.name === "Assistant") {
                html += '<div class="messages__item messages__item--visitor">' + item.message.replace(/\n/g, '<br>') + '</div>'
            }
            else {
                html += '<div class="messages__item messages__item--operator">' + item.message + '</div>'
            }
        });

        const chatmessage = chatbox.querySelector('.chatbox__messages');
        chatmessage.innerHTML = html;
    }
}


document.addEventListener('DOMContentLoaded', function () {
    const chatbox = new Chatbox();
    chatbox.display();
});
