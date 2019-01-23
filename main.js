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
            return (...args) => {
                if (status === 'pending') {
                    callback(...args)
                }
            }
        }
        const resolve = pendingEnsure((value) => {
            status = 'fulfilled'
            result = value
            this.hooks.forEach((hook) => {
                hook(status, result)
            })
        })
        const reject = pendingEnsure((err) => {
            status = 'rejected'
            result = err
            this.hooks.forEach((hook) => {
                hook(status, result)
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
    
    asyncExec(callback) {
        setTimeout(callback, 0)
    }

    then(onFulfilled) {
        const info = this.getInfo()
        const { status, result } = info
        if (status === 'pending') {
            let _resolve
            let _reject
            this.addHook((status, result) => {
                if (status === 'fulfilled') {
                    const next = onFulfilled(result)
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
                this.asyncExec(() => {
                    const next = onFulfilled(result)
                    if (next instanceof MyPromise) {
                        next.then((r) => {
                            resolve(r)
                        }).catch((e) => {
                            reject(e)
                        })
                    } else {
                        resolve(next)
                    }
                })
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
            this.addHook((status, result) => {
                if (status === 'fulfilled') {
                    _resolve(result)
                } else {
                    const next = onRejected(result)
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
                this.asyncExec(() => {
                    const next = onRejected(result)
                    if (next instanceof MyPromise) {
                        next.then((r) => {
                            resolve(r)
                        }).catch((e) => {
                            reject(e)
                        })
                    } else {
                        resolve(next)
                    }
                })
            })
        }
    }
    
    finally() {

    }
}




// test

const p = function(ms, v, success = true) {
    return new MyPromise((resolve, reject) => {
        setTimeout(function() {
            if (success) {
                resolve(v)
            } else {
                reject(new Error(v))
            }
        }, ms)
    })
}


const x = p(1000, 'p1')

x.then((info) => {
    log('info1', info)
    return p(1000, 'p2', false)
}).then((info) => {
    log('info2', info)
}).then((info) => {
    log('info3', info)
}).catch((err) => {
    log('err', err)
})

log('sync done')



// 
// x.then((info) => {
//     log('info', info)
//     return p(1000, 'p2', false)
// }).then((info) => {
//     log(info)
// }).then((info) => {
//     log(info)
// }).catch((err) => {
//     log(err)
// })
// log(1000)















