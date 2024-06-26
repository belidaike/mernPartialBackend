const express = require('express')
const path = require('path')
const cors = require('cors')
const mongoose = require('mongoose')
const authRoutes = require('./routes/auth.routes.js')
const Post = require('./models/Post')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const multer = require('multer')
const uploadMiddleware = multer({ dest: 'uploads/' })
const fs = require('fs')

const app = express()

// app.use(cors({ credentials: true, origin: 'http://localhost:3000' }))

const allowedOrigins = ['https://rtblogz.netlify.app'];
// const allowedOrigins = ['http://localhost:3000'];
app.use(express.static(path.join(__dirname, 'client/build')));

app.use(cors({
    credentials: true,
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));


app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(__dirname + '/uploads'))

mongoose.connect('mongodb+srv://ikebelida539:09109672506@cluster0.mre8jcv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')


// ORGANIZED DONE AND DUSTED HORAAA!
// app.post('/register', async (req, res) => {
//     const { username, password, email } = req.body
//     try {
//         const userDoc = await User.create({
//             username,
//             password: bcrypt.hashSync(password, salt),
//             email
//         })
//         res.json(userDoc)
//     } catch (err) {
//         res.status(409).json(err)
//     }
// })

// app.post('/login', async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         const userDoc = await User.findOne({ username });
//         if (!userDoc) return res.status(400).json({ message: 'Wrong credentials' });
//         const passOk = bcrypt.compareSync(password, userDoc.password);
//         if (passOk) {
//             jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
//                 if (err) return res.status(500).json({ message: 'Token generation failed', error: err });
//                 res.cookie('token', token, { httpOnly: true }).json({
//                     id: userDoc._id,
//                     username,
//                 });
//             });
//         } else {
//             res.status(400).json({ message: 'Wrong credentials' });
//         }
//     } catch (err) {
//         res.status(500).json({ message: 'Server error', error: err });
//     }
// });


// app.get('/profile', (req, res) => {
//     const { token } = req.cookies;
//     if (token) {
//         jwt.verify(token, secret, {}, (err, info) => {
//             if (err) return res.status(401).json({ message: 'Token verification failed', error: err });
//             res.json(info);
//         });
//     } else {
//         res.status(401).json({ message: 'No token provided' });
//     }
// });

// app.post('/logout', (req, res) => {
//     res.cookie('token', '').json('ok')
// })
app.use("/api/auth", authRoutes)


app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
    const { originalname, path } = req.file
    const parts = originalname.split('.')
    const ext = parts[parts.length - 1]
    const newPath = path + '.' + ext
    fs.renameSync(path, newPath)

    const { token } = req.cookies
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) {
            console.log(err)
        }

        const { title, summary, content, category } = req.body

        const postDoc = await Post.create({
            title,
            summary,
            content,
            category,
            cover: newPath,
            author: info.id
        })

        // res.json(info)
        res.json(postDoc)

    })
})

app.get('/post', async (req, res) => {
    // const posts = await Post.find()
    //  res.json(posts)
    // informal res.json(await Post.find())
    res.json(await Post.find()
        .populate('author', ['username'])
        .sort({ createdAt: -1 })
        .limit(20)
    )
})

app.get('/post/:id', async (req, res) => {
    const { id } = req.params
    const postDoc = await Post.findById(id)
        .populate('author', ['username'])
    res.json(postDoc)
})

app.put('/post/:id', uploadMiddleware.single('file'), async (req, res) => {
    const { id } = req.params;
    let newPath = null;
    if (req.file) {
        const { originalname, path } = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        newPath = path + '.' + ext;
        fs.renameSync(path, newPath);
    }
    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) {
            return res.status(401).json('Token verification failed');
        }
        const { title, summary, content, category } = req.body;
        const postDoc = await Post.findById(id);
        if (!postDoc) {
            return res.status(404).json('Post not found');
        }
        if (postDoc.author.toString() !== info.id) {
            return res.status(403).json('You are not the author of this post');
        }
        postDoc.title = title;
        postDoc.summary = summary;
        postDoc.content = content;
        postDoc.category = category;
        if (newPath) {
            postDoc.cover = newPath;
        }
        await postDoc.save();
        res.json(postDoc);
    });
});

app.delete('/post/:id', async (req, res) => {
    const { id } = req.params;
    const { token } = req.cookies;

    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) return res.status(401).json('Token verification failed');

        const postDoc = await Post.findById(id);
        if (!postDoc) return res.status(404).json('Post not found');

        if (postDoc.author.toString() !== info.id) {
            return res.status(403).json('You are not the author of this post');
        }

        await Post.findByIdAndDelete(id);
        res.json('Post deleted');
    });
});
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
});
app.listen(4000, () => {
    console.log('listening to port 4000')
})
