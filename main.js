const log = console.log.bind(console)

class MyPromise {
    constructor(executor) {
        // 用闭包存储状态信息，防止状态被外部修改
        let status = 'pending'
        let result = null
        this.getInfo = () => ({
            status,
            result
        })
        this.init()

        const pendingEnsure = (callback) => {
            if (status === 'pending') {
                callback()
            }
        }
        const resolve = pendingEnsure((value) => {
            status = 'fulfilled'
            result = value
            hooks.forEach((cb) => {
                cb(this)
            })
        })
        const reject = pendingEnsure((err) => {
            status = 'rejected'
            result = err
            hooks.forEach((cb) => {
                cb(this)
            })
        })
        executor(resolve, reject)
    }
    
    init() {
        this.hooks = []
    }
    
    addHook(hook) {
        this.hooks.push(hook)
    }

    then(onFulfilled) {
        const info = this.getInfo()
        const { status, result } = info
        if (status === 'pending') {
            let _resolve
            let _reject
            this.addHook((p) => {
                const info = p.getInfo()
                const { status, result } = info
                if (status === 'fulfilled') {
                    let next = onFulfilled(result)
                    if (next instanceof MyPromise) {
                        next.then((r) => {
                            _resolve(r)
                        }).catch((e) => {
                            _reject(e)
                        })
                    } else {
                        _resolve(next)
                    }
                } else {
                    _reject(result)
                }
            })
            return new MyPromise((resolve, reject) => {
                _resolve = resolve
                _reject = reject
            })
        } else if (status === 'fulfilled') {
            return new MyPromise((resolve, reject) => {
                setTimeout(function () {
                    let next = onFulfilled(result)
                    if (next instanceof MyPromise) {
                        next.then((r) => {
                            resolve(r)
                        }).catch((e) => {
                            reject(e)
                        })
                    } else {
                        resolve(next)
                    }
                }, 0);
            })
        } else {
            return new MyPromise((resolve, reject) => {
                reject(result)
            })
        }
    }

    catch (onRejected) {
        const info = this.getInfo()
        const { status, result } = info
        if (status === 'pending') {
            let _resolve
            let _reject
            this.addHook((p) => {
                const info = p.getInfo()
                const { status, result } = info
                if (status === 'fulfilled') {
                    _resolve(result)
                } else {
                    let next = onRejected(result)
                    if (next instanceof MyPromise) {
                        next.then((r) => {
                            _resolve(r)
                        }).catch((e) => {
                            _reject(e)
                        })
                    } else {
                        _resolve(next)
                    }
                }
            })
            return new MyPromise((resolve, reject) => {
                _resolve = resolve
                _reject = reject
            })
        } else if (status === 'fulfilled') {
            return new MyPromise((resolve, reject) => {
                resolve(result)
            })
        } else {
            return new MyPromise((resolve, reject) => {
                setTimeout(function () {
                    let next = onRejected(result)
                    if (next instanceof MyPromise) {
                        next.then((r) => {
                            resolve(r)
                        }).catch((e) => {
                            reject(e)
                        })
                    } else {
                        resolve(next)
                    }
                }, 0);
            })
        }
    }
    
    finally() {

    }
}

const p = function(ms, v, right = true) {
    return new MyPromise((resolve, reject) => {
        setTimeout(function() {
            if (right) {
                resolve(v)
            } else {
                reject(new Error(v))
            }
        }, ms)
    })
}



var x = p(1000, 'p1')

x.then((info) => {
    log('info', info)
    return p(1000, 'p2', false)
}).then((info) => {
    log(info)
}).then((info) => {
    log(info)
}).catch((err) => {
    log(err)
})
log(1000)















