const log = console.log.bind(console)

class MyPromise {
    constructor(executor) {
        // 用闭包存储 promise 的状态信息，防止状态被外部修改
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
                this._asyncExec(hook, status, result)
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
    
    _asyncExec(callback, ...args) {
        setTimeout(callback, 0, ...args)
    }
    
    _execOnTransform(onTransform, result, resolve, reject) {
        const next = onTransform(result)
        if (next instanceof MyPromise) {
            next.then((value) => {
                resolve(value)
            }).catch((err) => {
                reject(err)
            })
        } else {
            resolve(next)
        }
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
                [_resolve, _reject] = [resolve , reject]
            })
        } else if (status === 'fulfilled') {
            return new MyPromise((resolve, reject) => {
                this._asyncExec(this._execOnTransform.bind(this), onFulfilled, result, resolve, reject)
            })
        } else {
            return new MyPromise((resolve, reject) => {
                this._asyncExec(reject, result)
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
                [_resolve, _reject] = [resolve , reject]
            })
        } else if (status === 'fulfilled') {
            return new MyPromise((resolve, reject) => {
                this._asyncExec(resolve, result)
            })
        } else {
            return new MyPromise((resolve, reject) => {
                this._asyncExec(this._execOnTransform.bind(this), onRejected, result, resolve, reject)
            })
        }
    }
    
    finally(onFinally) {
        const info = this._getInfo()
        const { status, result } = info
        if (status === 'pending') {
            let _resolve, _reject
            this._addHook((status, result) => {
                onFinally()
                if (status === 'fulfilled') {
                    _resolve(result)
                } else {
                    _reject(result)
                }
            })
            return new MyPromise((resolve, reject) => {
                [_resolve, _reject] = [resolve , reject]
            })
        } else {
            return new MyPromise((resolve, reject) => {
                this._asyncExec(() => {
                    onFinally()
                    if (status === 'fulfilled') {
                        resolve(result)
                    } else {
                        reject(result)
                    }
                })
            })
        }
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
    return p(1000, 'p2')
}).finally(() => {
    log('finally 1')
}).finally(() => {
    log('finally 2')
}).then((info) => {
    log('info2', info)
    return p(1000, 'p2')
}).then((info) => {
    log('info3', info)
    return p(1000, 'p3', false)
}).catch((err) => {
    log('err', err)
}).finally(() => {
    log('finally 3')
})

log('sync code done')



