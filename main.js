const log = console.log.bind(console)

class MyPromise {
    constructor(executor) {
        // 用闭包存储状态信息，防止状态被外部修改
        let status = 'pending'
        let result = null
        this._getInfo = () => ({
            status,
            result
        })
        this._init()

        const pendingEnsure = (callback) => {
            return (...args) => {
                if (status === 'pending') {
                    callback(...args)
                }
            }
        }
        const transformStatus = (s, r) => {
            status = s
            result = r
            this.hooks.forEach((hook) => {
                hook(status, result)
            })
        }
        const resolve = pendingEnsure((value) => {
            transformStatus('fulfilled', value)
        })
        const reject = pendingEnsure((err) => {
            transformStatus('rejected', err)
        })
        executor(resolve, reject)
    }
    
    _init() {
        this.hooks = []
    }

    _addHook(hook) {
        this.hooks.push(hook)
    }
    
    _asyncExec(callback) {
        setTimeout(callback, 0)
    }
    
    _execOnTransform(onTransform, result, resolve, reject) {
        this._asyncExec(() => {
            const next = onTransform(result)
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
    }

    then(onFulfilled) {
        const info = this._getInfo()
        const { status, result } = info
        if (status === 'pending') {
            let _resolve, _reject
            this._addHook((status, result) => {
                if (status === 'fulfilled') {
                    this._execOnTransform(onFulfilled, result, _resolve, _reject)
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
                this._execOnTransform(onFulfilled, result, resolve, reject)
            })
        } else {
            return new MyPromise((resolve, reject) => {
                reject(result)
            })
        }
    }

    catch (onRejected) {
        const info = this._getInfo()
        const { status, result } = info
        if (status === 'pending') {
            let _resolve, _reject
            this._addHook((status, result) => {
                if (status === 'fulfilled') {
                    _resolve(result)
                } else {
                    this._execOnTransform(onRejected, result, _resolve, _reject)
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
                this._execOnTransform(onRejected, result, resolve, reject)
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

log('sync code done')



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















